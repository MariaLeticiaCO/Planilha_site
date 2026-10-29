using ControleVendas.Domain.Enums;

namespace ControleVendas.Application.DTOs;

public class NegocioDto
{
    public string Nome { get; set; } = "";
    public int? SetorId { get; set; }
    public string? Telefone { get; set; }
    public string? LogoUrl { get; set; }
    public bool PermitirEstoqueNegativo { get; set; } = true;
}

public class PerfilDto
{
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Telefone { get; set; }
}

public class ConviteVendedorDto
{
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
}

public record UsuarioListaDto(int Id, string Nome, string Email, PerfilUsuario Perfil, bool Ativo, DateTime? UltimoAcesso);

/// <summary>Resumo da empresa usado no layout e nos filtros.</summary>
public record EmpresaContextoDto(int Id, string Nome, Plano Plano, StatusAssinatura StatusAssinatura, bool AssinaturaAtiva,
    int DiasRestantesTrial, bool OnboardingConcluido, bool TemRecursosPro, string? LogoUrl);
