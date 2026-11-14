"""One switch, not scattered ifs: everything in pipeline/ asks here for its
clients and never imports clients/mock.py or clients/*_live.py directly."""
from app.config import get_settings


def get_clients():
    settings = get_settings()
    if settings.is_mock:
        from app.clients.mock import MockDiscoveryClient, MockScholarClient, MockUnlockerClient, MockAIClient
        return {
            "discovery": MockDiscoveryClient(),
            "scholar": MockScholarClient(),
            "unlocker": MockUnlockerClient(),
            "ai": MockAIClient(),
        }
    from app.clients.discovery_live import LiveDiscoveryClient
    from app.clients.bright_data_live import LiveScholarClient, LiveUnlockerClient
    from app.clients.gemini_live import LiveGeminiClient
    return {
        "discovery": LiveDiscoveryClient(),
        "scholar": LiveScholarClient(),
        "unlocker": LiveUnlockerClient(),
        "ai": LiveGeminiClient(),
    }
