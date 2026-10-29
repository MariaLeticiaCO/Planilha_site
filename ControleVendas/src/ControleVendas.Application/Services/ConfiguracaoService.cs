using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

public class ConfiguracaoService(
    IRepository<Usuario> usuarios,
    IUnitOfWork uow,
    EmpresaService empresaService,
    IContextoUsuario contexto,
    ISenhaHasher hasher,
    IEmailSender email,
    IExclusaoConta exclusao,
    IGatewayPagamento gateway)
{
    public async Task<NegocioDto> ObterNegocioAsync()
    {
        var e = await empresaService.ObterAsync();
        return new NegocioDto
        {
            Nome = e.Nome, SetorId = e.SetorId, Telefone = e.Telefone, LogoUrl = e.LogoUrl, PermitirEstoqueNegativo = e.PermitirEstoqueNegativo
        };
    }

    public async Task SalvarNegocioAsync(NegocioDto dto)
    {
        var e = await empresaService.ObterAsync();
        e.Nome = dto.Nome.Trim();
        e.SetorId = dto.SetorId;
        e.Telefone = Formatos.SoDigitos(dto.Telefone);
        e.PermitirEstoqueNegativo = dto.PermitirEstoqueNegativo;
        if (dto.LogoUrl is not null) e.LogoUrl = dto.LogoUrl;
        await uow.SalvarAsync();
    }

    public async Task<PerfilDto> ObterPerfilAsync()
    {
        var u = await ObterUsuarioLogadoAsync();
        return new PerfilDto { Nome = u.Nome, Email = u.Email, Telefone = u.Telefone };
    }

    public async Task SalvarPerfilAsync(PerfilDto dto)
    {
        var u = await ObterUsuarioLogadoAsync();
        var novoEmail = AuthService.NormalizarEmail(dto.Email);
        if (novoEmail != u.Email && await usuarios.QuerySemFiltroEmpresa().AnyAsync(x => x.Email == novoEmail))
            throw new RegraNegocioException("Este e-mail já está em uso.");
        u.Nome = dto.Nome.Trim();
        u.Email = novoEmail;
        u.Telefone = Formatos.SoDigitos(dto.Telefone);
        await uow.SalvarAsync();
    }

    public async Task<IReadOnlyList<UsuarioListaDto>> ListarUsuariosAsync() =>
        await usuarios.Query().OrderBy(u => u.Perfil).ThenBy(u => u.Nome)
            .Select(u => new UsuarioListaDto(u.Id, u.Nome, u.Email, u.Perfil, u.Ativo, u.UltimoAcesso))
            .ToListAsync();

    /// <summary>Cria o usuário Vendedor e manda um link (válido por 2 dias) para ele criar a senha.</summary>
    public async Task ConvidarVendedorAsync(ConviteVendedorDto dto, Func<string, string> montarLink)
    {
        var empresa = await empresaService.ObterAsync();
        var ativos = await usuarios.Query().CountAsync(u => u.Ativo);
        if (ativos >= empresa.LimiteUsuarios)
            throw new RegraNegocioException(empresa.TemRecursosPro
                ? $"Seu plano permite até {empresa.LimiteUsuarios} usuários."
                : "O plano Básico tem 1 usuário. Passe para o Pro para convidar vendedores.");

        var emailNormalizado = AuthService.NormalizarEmail(dto.Email);
        if (await usuarios.QuerySemFiltroEmpresa().AnyAsync(u => u.Email == emailNormalizado))
            throw new RegraNegocioException("Já existe um usuário com este e-mail.");

        var agora = Relogio.Agora;
        var vendedor = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = emailNormalizado,
            Perfil = PerfilUsuario.VENDEDOR,
            DataCadastro = agora
        };
        // Senha aleatória até o convidado criar a dele pelo link.
        vendedor.SenhaHash = hasher.Hash(vendedor, Guid.NewGuid().ToString("N"));
        var token = AuthService.GerarToken(vendedor, AuthService.ValidadeConvite);
        usuarios.Adicionar(vendedor);
        await uow.SalvarAsync();

        var link = montarLink(token);
        await email.EnviarAsync(vendedor.Email, $"Convite para vender com {empresa.Nome}",
            $"""
             <p>Olá, {System.Net.WebUtility.HtmlEncode(vendedor.Nome)}!</p>
             <p>Você foi convidado(a) para registrar vendas de <b>{System.Net.WebUtility.HtmlEncode(empresa.Nome)}</b> no Controle de Vendas.</p>
             <p><a href="{link}">Criar minha senha</a> (o link vale por 2 dias).</p>
             """);
    }

    public async Task AlterarAtivoUsuarioAsync(int id, bool ativo)
    {
        if (id == contexto.UsuarioId) throw new RegraNegocioException("Você não pode desativar o próprio usuário.");
        var u = await usuarios.Query().FirstOrDefaultAsync(x => x.Id == id) ?? throw new NaoEncontradoException("Usuário");
        if (u.Perfil == PerfilUsuario.DONO) throw new RegraNegocioException("O dono da conta não pode ser desativado.");
        if (ativo && !u.Ativo)
        {
            var empresa = await empresaService.ObterAsync();
            if (await usuarios.Query().CountAsync(x => x.Ativo) >= empresa.LimiteUsuarios)
                throw new RegraNegocioException($"Seu plano permite até {empresa.LimiteUsuarios} usuário(s) ativo(s).");
        }
        u.Ativo = ativo;
        await uow.SalvarAsync();
    }

    /// <summary>LGPD: exclui a conta e todos os dados. Pede a senha para confirmar.</summary>
    public async Task ExcluirContaAsync(string senha)
    {
        if (!contexto.EhDono) throw new RegraNegocioException("Só o dono pode excluir a conta.");
        var u = await ObterUsuarioLogadoAsync();
        if (!hasher.Verificar(u, senha)) throw new RegraNegocioException("Senha incorreta.");

        var empresa = await empresaService.ObterAsync();
        if (!string.IsNullOrEmpty(empresa.GatewayAssinaturaId))
        {
            try { await gateway.CancelarAssinaturaAsync(empresa.GatewayAssinaturaId); }
            catch { /* a exclusão dos dados não pode depender do gateway */ }
        }
        await exclusao.ExcluirTudoAsync(empresa.Id);
    }

    private async Task<Usuario> ObterUsuarioLogadoAsync() =>
        await usuarios.Query().FirstOrDefaultAsync(u => u.Id == contexto.UsuarioId) ?? throw new NaoEncontradoException("Usuário");
}
