namespace BarberBooking.Shared.Results
{
    public interface IResult
    {
        bool Success { get; }
        string? Message { get; }
        int StatusCode { get; }
    }

    public interface IDataResult<out T> : IResult
    {
        T? Data { get; }
    }
}