using ControleVendas.Application.DTOs;
using ControleVendas.Domain.Rules;
using FluentValidation;

namespace ControleVendas.Application.Validators;

internal static class RegrasComuns
{
    public static IRuleBuilderOptions<T, string> SenhaForte<T>(this IRuleBuilder<T, string> regra) => regra
        .NotEmpty().WithMessage("Informe a senha.")
        .MinimumLength(8).WithMessage("A senha precisa ter pelo menos 8 caracteres.")
        .Matches(".*[A-Za-z].*").WithMessage("A senha precisa ter pelo menos uma letra.")
        .Matches(".*[0-9].*").WithMessage("A senha precisa ter pelo menos um número.");

    public static IRuleBuilderOptions<T, string?> Telefone<T>(this IRuleBuilder<T, string?> regra) => regra
        .Must(t => string.IsNullOrWhiteSpace(t) || (t.Count(char.IsDigit) is >= 10 and <= 13))
        .WithMessage("Informe o telefone com DDD.");
}

public class CadastroDtoValidator : AbstractValidator<CadastroDto>
{
    public CadastroDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe seu nome.").MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().WithMessage("Informe o e-mail.").EmailAddress().WithMessage("E-mail inválido.").MaximumLength(160);
        RuleFor(x => x.WhatsApp).NotEmpty().WithMessage("Informe o WhatsApp.");
        RuleFor(x => (string?)x.WhatsApp).Telefone().OverridePropertyName(nameof(CadastroDto.WhatsApp));
        RuleFor(x => x.Senha).SenhaForte();
        RuleFor(x => x.ConfirmarSenha).Equal(x => x.Senha).WithMessage("As senhas não conferem.");
        RuleFor(x => x.AceiteTermos).Equal(true).WithMessage("É preciso aceitar os termos de uso e a política de privacidade.");
    }
}

public class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Informe o e-mail.").EmailAddress().WithMessage("E-mail inválido.");
        RuleFor(x => x.Senha).NotEmpty().WithMessage("Informe a senha.");
    }
}

public class EsqueciSenhaDtoValidator : AbstractValidator<EsqueciSenhaDto>
{
    public EsqueciSenhaDtoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Informe o e-mail.").EmailAddress().WithMessage("E-mail inválido.");
    }
}

public class RedefinirSenhaDtoValidator : AbstractValidator<RedefinirSenhaDto>
{
    public RedefinirSenhaDtoValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.Senha).SenhaForte();
        RuleFor(x => x.ConfirmarSenha).Equal(x => x.Senha).WithMessage("As senhas não conferem.");
    }
}

public class TrocarSenhaDtoValidator : AbstractValidator<TrocarSenhaDto>
{
    public TrocarSenhaDtoValidator()
    {
        RuleFor(x => x.SenhaAtual).NotEmpty().WithMessage("Informe a senha atual.");
        RuleFor(x => x.NovaSenha).SenhaForte();
        RuleFor(x => x.ConfirmarSenha).Equal(x => x.NovaSenha).WithMessage("As senhas não conferem.");
    }
}

public class OnboardingDtoValidator : AbstractValidator<OnboardingDto>
{
    public OnboardingDtoValidator()
    {
        RuleFor(x => x.NomeNegocio).NotEmpty().WithMessage("Informe o nome do negócio.").MaximumLength(120);
        RuleFor(x => x.SetorId).NotNull().WithMessage("Escolha o setor do seu negócio.");
        RuleFor(x => x.Formas).Must(f => f.Any(x => x.Ativo)).WithMessage("Deixe pelo menos uma forma de pagamento marcada.");
        RuleForEach(x => x.Formas).ChildRules(f =>
            f.RuleFor(x => x.TaxaPercentual).InclusiveBetween(0, 100).WithMessage("A taxa deve ficar entre 0% e 100%."));
        When(x => !x.PularProduto && !string.IsNullOrWhiteSpace(x.ProdutoNome), () =>
        {
            RuleFor(x => x.ProdutoCusto).NotNull().WithMessage("Informe o custo.").GreaterThanOrEqualTo(0);
            RuleFor(x => x.ProdutoPreco).NotNull().WithMessage("Informe o preço.").GreaterThan(0).WithMessage("O preço precisa ser maior que zero.");
        });
    }
}

public class ProdutoDtoValidator : AbstractValidator<ProdutoDto>
{
    public ProdutoDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome do produto.").MaximumLength(120);
        RuleFor(x => x.Codigo).MaximumLength(40);
        RuleFor(x => x.Custo).GreaterThanOrEqualTo(0).WithMessage("O custo não pode ser negativo.");
        RuleFor(x => x.PrecoVenda).GreaterThan(0).WithMessage("O preço de venda precisa ser maior que zero.");
        RuleFor(x => x.EstoqueMinimo).GreaterThanOrEqualTo(0).WithMessage("O estoque mínimo não pode ser negativo.");
    }
}

public class FormaPagamentoDtoValidator : AbstractValidator<FormaPagamentoDto>
{
    public FormaPagamentoDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome.").MaximumLength(40);
        RuleFor(x => x.Tipo).IsInEnum();
        RuleFor(x => x.TaxaPercentual).InclusiveBetween(0, 100).WithMessage("A taxa deve ficar entre 0% e 100%.");
        RuleFor(x => x.TaxaFixa).GreaterThanOrEqualTo(0).WithMessage("A taxa fixa não pode ser negativa.");
    }
}

public class ClienteDtoValidator : AbstractValidator<ClienteDto>
{
    public ClienteDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome do cliente.").MaximumLength(120);
        RuleFor(x => x.Telefone).Telefone();
        RuleFor(x => x.Documento).MaximumLength(20);
        RuleFor(x => x.Observacao).MaximumLength(500);
    }
}

public class NegocioDtoValidator : AbstractValidator<NegocioDto>
{
    public NegocioDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome do negócio.").MaximumLength(120);
        RuleFor(x => x.Telefone).Telefone();
    }
}

public class PerfilDtoValidator : AbstractValidator<PerfilDto>
{
    public PerfilDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe seu nome.").MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("E-mail inválido.");
        RuleFor(x => x.Telefone).Telefone();
    }
}

public class ConviteVendedorDtoValidator : AbstractValidator<ConviteVendedorDto>
{
    public ConviteVendedorDtoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome.").MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("E-mail inválido.");
    }
}

public class NovaVendaDtoValidator : AbstractValidator<NovaVendaDto>
{
    public NovaVendaDtoValidator()
    {
        RuleFor(x => x.Itens).NotEmpty().WithMessage("Adicione pelo menos 1 produto à venda.");
        RuleForEach(x => x.Itens).ChildRules(i =>
            i.RuleFor(x => x.Quantidade).GreaterThan(0).WithMessage("A quantidade precisa ser maior que zero."));
        RuleFor(x => x.FormaPagamentoId).GreaterThan(0).WithMessage("Escolha a forma de pagamento.");
        RuleFor(x => x.Desconto).GreaterThanOrEqualTo(0).WithMessage("O desconto não pode ser negativo.");
        RuleFor(x => x.Desconto).LessThanOrEqualTo(100).When(x => x.DescontoEmPercentual)
            .WithMessage("O desconto não pode passar de 100%.");
        RuleFor(x => x.QtdParcelas).InclusiveBetween(1, GeradorParcelas.MaxParcelas)
            .WithMessage($"Informe de 1 a {GeradorParcelas.MaxParcelas} parcelas.");
        RuleFor(x => x.Observacao).MaximumLength(500);
    }
}
