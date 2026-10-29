using ControleVendas.Application.Common;
using ControleVendas.Application.Interfaces;

namespace ControleVendas.Web.Infra;

/// <summary>Guarda fotos e logos em wwwroot/uploads/{empresa}/. Aceita só imagens até 3 MB.</summary>
public class ArmazenamentoLocal(IWebHostEnvironment env, IContextoUsuario usuario) : IArmazenamentoArquivos
{
    private static readonly string[] Extensoes = [".jpg", ".jpeg", ".png", ".webp"];
    public const long TamanhoMaximo = 3 * 1024 * 1024;

    public async Task<string> SalvarImagemAsync(Stream conteudo, string nomeOriginal, string pasta, CancellationToken ct = default)
    {
        var extensao = Path.GetExtension(nomeOriginal).ToLowerInvariant();
        if (!Extensoes.Contains(extensao)) throw new RegraNegocioException("Envie uma imagem JPG, PNG ou WEBP.");
        if (conteudo.CanSeek && conteudo.Length > TamanhoMaximo) throw new RegraNegocioException("A imagem pode ter no máximo 3 MB.");

        // Confere a assinatura do arquivo, não só a extensão.
        var cabecalho = new byte[12];
        var lidos = await conteudo.ReadAsync(cabecalho, ct);
        if (!EhImagem(cabecalho.AsSpan(0, lidos))) throw new RegraNegocioException("O arquivo enviado não é uma imagem válida.");
        if (conteudo.CanSeek) conteudo.Position = 0;

        var relativo = Path.Combine("uploads", usuario.EmpresaId.ToString(), pasta);
        var diretorio = Path.Combine(env.WebRootPath, relativo);
        Directory.CreateDirectory(diretorio);
        var nome = $"{Guid.NewGuid():N}{extensao}";
        await using (var arquivo = File.Create(Path.Combine(diretorio, nome)))
        {
            if (!conteudo.CanSeek) await arquivo.WriteAsync(cabecalho.AsMemory(0, lidos), ct);
            await conteudo.CopyToAsync(arquivo, ct);
        }
        return "/" + Path.Combine(relativo, nome).Replace('\\', '/');
    }

    private static bool EhImagem(ReadOnlySpan<byte> b) =>
        (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) ||                              // JPEG
        (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) ||              // PNG
        (b.Length >= 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46 &&
         b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50);                               // WEBP
}
