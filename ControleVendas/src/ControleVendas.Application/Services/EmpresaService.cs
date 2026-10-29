using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Interfaces;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Rules;
using Microsoft.EntityFrameworkCore;

namespace ControleVendas.Application.Services;

/// <summary>Dados da empresa logada, carregados uma vez por requisição.</summary>
public class EmpresaService(IRepository<Empresa> empresas, IContextoUsuario usuario)
{
    private Empresa? _empresa;

    public async Task<Empresa> ObterAsync()
    {
        if (_empresa is not null) return _empresa;
        _empresa = await empresas.Query().FirstOrDefaultAsync(e => e.Id == usuario.EmpresaId)
                   ?? throw new NaoEncontradoException("Empresa");
        return _empresa;
    }

    public async Task<EmpresaContextoDto> ObterContextoAsync()
    {
        var e = await ObterAsync();
        var agora = Relogio.Agora;
        return new EmpresaContextoDto(e.Id, e.Nome, e.Plano, e.StatusAssinatura, e.AssinaturaAtiva(agora),
            e.DiasRestantesTrial(agora), e.OnboardingConcluido, e.TemRecursosPro, e.LogoUrl);
    }

    public async Task ExigirProAsync(string recurso)
    {
        if (!(await ObterAsync()).TemRecursosPro) throw new RecursoProException(recurso);
    }
}
