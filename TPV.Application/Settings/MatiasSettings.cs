namespace TPV.Application.Settings
{
    public class MatiasSettings
    {
        public string BaseUrl { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string ApiKey { get; set; }
        public bool EnableMock { get; set; } = true;
    }
}