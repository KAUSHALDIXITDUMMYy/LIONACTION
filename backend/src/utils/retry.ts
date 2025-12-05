interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 1000 } = retryOptions

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // If successful, return immediately
      if (response.ok) {
        return response
      }

      // If rate limited (429), wait and retry
      if (response.status === 429) {
        const delay = baseDelay * (attempt + 1)
        await sleep(delay)
        continue
      }

      // For other errors, throw to trigger retry logic
      if (response.status >= 500) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      // For client errors (4xx), don't retry
      return response
    } catch (error) {
      // If last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  throw new Error('Max retries exceeded')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

