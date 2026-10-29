using System.Security.Cryptography;
using System.Text;
using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class AuthService(
    IRepository<Usuario> usuarios,
    IRepository<Empresa> empresas,
    IUnitOfWork uow,
    ISenhaHasher hasher,
    IEmailSender email)
{
    public static readonly TimeSpan ValidadeTokenRecuperacao = TimeSpan.FromHours(1);
    public static readonly TimeSpan ValidadeConvite = TimeSpan.FromDays(2);
    public static readonly TimeSpan TempoBloqueio = TimeSpan.FromMinutes(15);

    /// <summary>Cria Empresa (TRIAL de 7 dias) e Usuario (DONO). O onboarding vem em seguida.</summary>
    public async Task<UsuarioLogadoDto> CadastrarAsync(CadastroDto dto)
    {
        var emailNormalizado = NormalizarEmail(dto.Email);
        if (await usuarios.QuerySemFiltroEmpresa().AnyAsync(u => u.Email == emailNormalizado))
            throw new RegraNegocioException("Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.");

        var agora = Relogio.Agora;
        var empresa = new Empresa
        {
            Nome = "Meu negócio",
            Telefone = Formatos.SoDigitos(dto.WhatsApp),
            Plano = Plano.TESTE,
            StatusAssinatura = StatusAssinatura.TRIAL,
            DataFimTrial = agora.AddDays(Empresa.DiasTrial),
            DataCadastro = agora
        };
        empresas.Adicionar(empresa);
        await uow.SalvarAsync();

        var usuario = new Usuario
        {
            EmpresaId = empresa.Id,
            Nome = dto.Nome.Trim(),
            Email = emailNormalizado,
            Telefone = Formatos.SoDigitos(dto.WhatsApp),
            Perfil = PerfilUsuario.DONO,
            AceiteTermosEm = agora,
            UltimoAcesso = agora,
            DataCadastro = agora
        };
        usuario.SenhaHash = hasher.Hash(usuario, dto.Senha);
        usuarios.Adicionar(usuario);
        await uow.SalvarAsync();

        return Mapear(usuario, empresa);
    }

    /// <summary>Confere e-mail e senha. Bloqueia por 15 minutos depois de 5 tentativas erradas.</summary>
    public async Task<ResultadoLoginDto> AutenticarAsync(string emailInformado, string senha)
    {
        const string erroPadrao = "E-mail ou senha incorretos.";
        var emailNormalizado = NormalizarEmail(emailInformado);
        var usuario = await usuarios.QuerySemFiltroEmpresa().Include(u => u.Empresa)
            .FirstOrDefaultAsync(u => u.Email == emailNormalizado);
        if (usuario is null || !usuario.Ativo) return new ResultadoLoginDto(null, erroPadrao);

        var agora = Relogio.Agora;
        if (usuario.BloqueadoAte > agora)
        {
            var minutos = (int)Math.Ceiling((usuario.BloqueadoAte.Value - agora).TotalMinutes);
            return new ResultadoLoginDto(null, $"Muitas tentativas erradas. Tente de novo em {minutos} min ou recupere a senha.");
        }

        if (!hasher.Verificar(usuario, senha))
        {
            usuario.TentativasFalhas++;
            if (usuario.TentativasFalhas >= Usuario.MaxTentativasLogin)
            {
                usuario.BloqueadoAte = agora.Add(TempoBloqueio);
                usuario.TentativasFalhas = 0;
                await uow.SalvarAsync();
                return new ResultadoLoginDto(null, "Conta bloqueada por 15 minutos após 5 tentativas erradas.");
            }
            await uow.SalvarAsync();
            return new ResultadoLoginDto(null, erroPadrao);
        }

        usuario.TentativasFalhas = 0;
        usuario.BloqueadoAte = null;
        usuario.UltimoAcesso = agora;
        await uow.SalvarAsync();
        return new ResultadoLoginDto(Mapear(usuario, usuario.Empresa!), null);
    }

    /// <summary>Recarrega os dados do usuário para renovar as claims (ex.: depois do onboarding).</summary>
    public async Task<UsuarioLogadoDto?> ObterUsuarioLogadoAsync(int usuarioId)
    {
        var usuario = await usuarios.QuerySemFiltroEmpresa().Include(u => u.Empresa)
            .FirstOrDefaultAsync(u => u.Id == usuarioId && u.Ativo);
        return usuario is null ? null : Mapear(usuario, usuario.Empresa!);
    }

    /// <summary>
    /// Gera um token válido por 1 hora e manda o link por e-mail. Não revela se o e-mail existe.
    /// </summary>
    public async Task SolicitarRecuperacaoAsync(string emailInformado, Func<string, string> montarLink)
    {
        var emailNormalizado = NormalizarEmail(emailInformado);
        var usuario = await usuarios.QuerySemFiltroEmpresa().FirstOrDefaultAsync(u => u.Email == emailNormalizado && u.Ativo);
        if (usuario is null) return;

        var token = GerarToken(usuario, ValidadeTokenRecuperacao);
        await uow.SalvarAsync();

        var link = montarLink(token);
        await email.EnviarAsync(usuario.Email, "Crie uma nova senha — Controle de Vendas",
            $"""
             <p>Olá, {System.Net.WebUtility.HtmlEncode(usuario.Nome)}!</p>
             <p>Recebemos um pedido para criar uma nova senha. O link vale por 1 hora:</p>
             <p><a href="{link}">Criar nova senha</a></p>
             <p>Se não foi você, ignore este e-mail.</p>
             """);
    }

    public async Task<bool> TokenValidoAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;
        var hash = HashToken(token);
        var agora = Relogio.Agora;
        return await usuarios.QuerySemFiltroEmpresa()
            .AnyAsync(u => u.TokenRecuperacaoHash == hash && u.TokenExpiraEm > agora && u.Ativo);
    }

    public async Task RedefinirSenhaAsync(RedefinirSenhaDto dto)
    {
        var hash = HashToken(dto.Token);
        var agora = Relogio.Agora;
        var usuario = await usuarios.QuerySemFiltroEmpresa()
            .FirstOrDefaultAsync(u => u.TokenRecuperacaoHash == hash && u.TokenExpiraEm > agora && u.Ativo)
            ?? throw new RegraNegocioException("Este link expirou ou já foi usado. Peça um novo.");

        usuario.SenhaHash = hasher.Hash(usuario, dto.Senha);
        usuario.TokenRecuperacaoHash = null;
        usuario.TokenExpiraEm = null;
        usuario.TentativasFalhas = 0;
        usuario.BloqueadoAte = null;
        usuario.AceiteTermosEm ??= agora;
        await uow.SalvarAsync();
    }

    public async Task TrocarSenhaAsync(int usuarioId, TrocarSenhaDto dto)
    {
        var usuario = await usuarios.Query().FirstOrDefaultAsync(u => u.Id == usuarioId)
                      ?? throw new NaoEncontradoException("Usuário");
        if (!hasher.Verificar(usuario, dto.SenhaAtual))
            throw new RegraNegocioException("A senha atual está incorreta.");
        usuario.SenhaHash = hasher.Hash(usuario, dto.NovaSenha);
        await uow.SalvarAsync();
    }

    /// <summary>Gera o token, grava só o hash dele e devolve o token em claro (para ir no link).</summary>
    internal static string GerarToken(Usuario usuario, TimeSpan validade)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        usuario.TokenRecuperacaoHash = HashToken(token);
        usuario.TokenExpiraEm = Relogio.Agora.Add(validade);
        return token;
    }

    internal static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    internal static string NormalizarEmail(string email) => email.Trim().ToLowerInvariant();

    private static UsuarioLogadoDto Mapear(Usuario u, Empresa e) =>
        new(u.Id, u.EmpresaId, u.Nome, u.Email, u.Perfil.ToString(), e.OnboardingConcluido);
}
