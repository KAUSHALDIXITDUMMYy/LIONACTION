import { logger } from './logger'

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
      // Create abort controller for timeout (compatible with older Node versions)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // If successful, return immediately
      if (response.ok) {
        if (attempt > 0) {
          logger.info('Retry succeeded', { url: url.replace(/apiKey=[^&]+/, 'apiKey=***'), attempt: attempt + 1 })
        }
        return response
      }

      // If rate limited (429), wait and retry with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : baseDelay * Math.pow(2, attempt + 1)

        logger.warn('Rate limited, retrying', {
          url: url.replace(/apiKey=[^&]+/, 'apiKey=***'),
          attempt: attempt + 1,
          maxRetries,
          delay: `${delay}ms`,
        })

        if (attempt < maxRetries - 1) {
          await sleep(delay)
          continue
        }
      }

      // For server errors (5xx), retry with exponential backoff
      if (response.status >= 500) {
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          logger.warn('Server error, retrying', {
            url: url.replace(/apiKey=[^&]+/, 'apiKey=***'),
            status: response.status,
            attempt: attempt + 1,
            delay: `${delay}ms`,
          })
          await sleep(delay)
          continue
        }
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      // For client errors (4xx), don't retry (except 429 which is handled above)
      return response
    } catch (error) {
      // Handle timeout and network errors
      const isTimeout = error instanceof Error && error.name === 'AbortError'
      const isNetworkError = error instanceof TypeError

      if (isTimeout || isNetworkError) {
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          logger.warn('Network/timeout error, retrying', {
            url: url.replace(/apiKey=[^&]+/, 'apiKey=***'),
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt: attempt + 1,
            delay: `${delay}ms`,
          })
          await sleep(delay)
          continue
        }
      }

      // If last attempt, throw the error
      if (attempt === maxRetries - 1) {
        logger.error('Max retries exceeded', {
          url: url.replace(/apiKey=[^&]+/, 'apiKey=***'),
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: maxRetries,
        })
        throw error
      }

      // Exponential backoff for other errors
      const delay = baseDelay * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  throw new Error('Max retries exceeded')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

