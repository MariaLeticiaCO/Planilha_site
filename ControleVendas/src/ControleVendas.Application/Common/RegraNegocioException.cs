namespace ControleVendas.Application.Common;

/// <summary>Violação de regra de negócio. A mensagem é mostrada ao usuário.</summary>
public class RegraNegocioException(string mensagem) : Exception(mensagem);

/// <summary>Recurso exclusivo do plano Pro (ou do teste grátis).</summary>
public class RecursoProException(string recurso)
    : RegraNegocioException($"{recurso} faz parte do plano Pro. Faça o upgrade em Assinatura.");

public class NaoEncontradoException(string oQue) : RegraNegocioException($"Não encontramos este registro ({oQue.ToLowerInvariant()}).");
