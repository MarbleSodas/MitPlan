import httpx
from typing import Optional


class HTTPClient:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self._base_url = base_url
        self.timeout = timeout
        self._client: Optional[httpx.Client] = None
    
    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            base = self._base_url if self._base_url is not None else None
            self._client = httpx.Client(
                base_url=base,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._client
    
    def get(self, url: str, **kwargs) -> httpx.Response:
        return self.client.get(url, **kwargs)
    
    def post(self, url: str, **kwargs) -> httpx.Response:
        return self.client.post(url, **kwargs)
    
    def close(self):
        if self._client:
            self._client.close()
            self._client = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class AsyncHTTPClient:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self._base_url = base_url
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    async def client(self) -> httpx.AsyncClient:
        if self._client is None:
            base = self._base_url if self._base_url is not None else None
            self._client = httpx.AsyncClient(
                base_url=base,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._client
    
    async def get(self, url: str, **kwargs) -> httpx.Response:
        return await (await self.client).get(url, **kwargs)
    
    async def post(self, url: str, **kwargs) -> httpx.Response:
        return await (await self.client).post(url, **kwargs)
    
    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
