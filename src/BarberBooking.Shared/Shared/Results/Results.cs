namespace BarberBooking.Shared.Results
{
    public class Result : IResult
    {
        public bool Success { get; }
        public string? Message { get; }
        public int StatusCode { get; }
        public List<string>? Errors { get; }

        public Result(bool success, string? message = null, int statusCode = 200, List<string>? errors = null)
        {
            Success = success;
            Message = message;
            StatusCode = statusCode;
            Errors = errors;
        }

        public static Result Ok(string? message = null) => new(true, message, 200);
        public static Result Fail(string message, int statusCode = 400, List<string>? errors = null) => new(false, message, statusCode, errors);
    }

    public class DataResult<T> : Result, IDataResult<T>
    {
        public T? Data { get; }

        public DataResult(bool success, T? data, string? message = null, int statusCode = 200, List<string>? errors = null)
            : base(success, message, statusCode, errors)
        {
            Data = data;
        }

        public static DataResult<T> Ok(T data, string? message = null) => new(true, data, message, 200);
        public static new DataResult<T> Fail(string message, int statusCode = 400, List<string>? errors = null) => new(false, default, message, statusCode, errors);
    }
}