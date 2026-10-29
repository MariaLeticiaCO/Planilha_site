namespace ControleVendas.Domain.Rules;

/// <summary>Hora oficial de Brasília, usada em todas as datas gravadas pelo sistema.</summary>
public static class Relogio
{
    private static readonly TimeZoneInfo Fuso = ObterFuso();

    public static DateTime Agora => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Fuso);
    public static DateTime Hoje => Agora.Date;

    private static TimeZoneInfo ObterFuso()
    {
        foreach (var id in new[] { "America/Sao_Paulo", "E. South America Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
        }
        return TimeZoneInfo.CreateCustomTimeZone("BRT", TimeSpan.FromHours(-3), "Brasília", "Brasília");
    }
}
