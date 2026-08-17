using Microsoft.EntityFrameworkCore.Storage;
using System;
using System.Threading.Tasks;
using TPV.Application.Interfaces;

namespace TPV.Infrastructure.Persistence
{
    public class ApplicationTransaction : IApplicationTransaction
    {
        private readonly ApplicationDbContext _dbContext;

        public ApplicationTransaction(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation)
        {
            if (_dbContext.Database.CurrentTransaction != null)
            {
                return await operation();
            }

            await using IDbContextTransaction transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var result = await operation();
                await transaction.CommitAsync();
                return result;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
