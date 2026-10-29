namespace ControleVendas.Application.Interfaces;

/// <summary>LGPD: apaga a empresa e todos os dados dela.</summary>
public interface IExclusaoConta
{
    Task ExcluirTudoAsync(int empresaId, CancellationToken ct = default);
}
