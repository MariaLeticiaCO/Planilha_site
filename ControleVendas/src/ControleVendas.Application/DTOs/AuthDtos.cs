namespace ControleVendas.Application.DTOs;

public class CadastroDto
{
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string WhatsApp { get; set; } = "";
    public string Senha { get; set; } = "";
    public string ConfirmarSenha { get; set; } = "";
    public bool AceiteTermos { get; set; }
}

public class LoginDto
{
    public string Email { get; set; } = "";
    public string Senha { get; set; } = "";
    public bool LembrarDeMim { get; set; }
    public string? ReturnUrl { get; set; }
}

public class EsqueciSenhaDto
{
    public string Email { get; set; } = "";
}

public class RedefinirSenhaDto
{
    public string Token { get; set; } = "";
    public string Senha { get; set; } = "";
    public string ConfirmarSenha { get; set; } = "";
}

public class TrocarSenhaDto
{
    public string SenhaAtual { get; set; } = "";
    public string NovaSenha { get; set; } = "";
    public string ConfirmarSenha { get; set; } = "";
}

/// <summary>Dados que vão para as claims do cookie.</summary>
public record UsuarioLogadoDto(int UsuarioId, int EmpresaId, string Nome, string Email, string Perfil, bool OnboardingConcluido);

public record ResultadoLoginDto(UsuarioLogadoDto? Usuario, string? Erro)
{
    public bool Sucesso => Usuario is not null;
}
