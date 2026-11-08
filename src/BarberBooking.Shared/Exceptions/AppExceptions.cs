namespace BarberBooking.Shared.Exceptions
{
    public abstract class BaseCustomException : Exception
    {
        public int StatusCode { get; }

        protected BaseCustomException(string message, int statusCode = 400) : base(message)
        {
            StatusCode = statusCode;
        }
    }

    public class BusinessRuleException : BaseCustomException
    {
        public BusinessRuleException(string message) : base(message, 400) { }
    }

    public class NotFoundException : BaseCustomException
    {
        public NotFoundException(string message) : base(message, 404) { }
        public NotFoundException(string entityName, object key) 
            : base($"'{entityName}' ({key}) kaydı bulunamadı.", 404) { }
    }

    public class ConflictException : BaseCustomException
    {
        public ConflictException(string message) : base(message, 409) { }
    }

    public class ForbiddenException : BaseCustomException
    {
        public ForbiddenException(string message = "Bu işlem için yetkiniz bulunmamaktadır.") 
            : base(message, 403) { }
    }

    public class ValidationAppException : BaseCustomException
    {
        public IDictionary<string, string[]> Errors { get; }

        public ValidationAppException(IDictionary<string, string[]> errors) 
            : base("Bir veya daha fazla doğrulama hatası oluştu.", 400)
        {
            Errors = errors;
        }
    }
}