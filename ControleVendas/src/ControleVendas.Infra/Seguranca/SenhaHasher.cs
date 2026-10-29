using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace ControleVendas.Infra.Seguranca;

/// <summary>PasswordHasher&lt;Usuario&gt; do ASP.NET Core (PBKDF2). Senha nunca fica em texto.</summary>
public class SenhaHasher : ISenhaHasher
{
    private readonly PasswordHasher<Usuario> _hasher = new();

    public string Hash(Usuario usuario, string senha) => _hasher.HashPassword(usuario, senha);

    public bool Verificar(Usuario usuario, string senha) =>
        _hasher.VerifyHashedPassword(usuario, usuario.SenhaHash, senha) != PasswordVerificationResult.Failed;
}
