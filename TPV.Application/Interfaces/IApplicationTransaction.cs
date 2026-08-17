using System;
using System.Threading.Tasks;

namespace TPV.Application.Interfaces
{
    public interface IApplicationTransaction
    {
        Task<T> ExecuteAsync<T>(Func<Task<T>> operation);
    }
}
