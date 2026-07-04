import { useQuery } from '@tanstack/react-query'


const cache = new Map()

export async function fetchAnimalGif(query) {
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY

  if (!apiKey) {
    return { url: '', failed: true }
  }

  const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1&rating=g`
  )

  if (!res.ok) {
    throw new Error('Giphy request failed')
  }

  const data = await res.json()
  const url = data?.data?.[0]?.images?.fixed_height?.url || ''

  if (!url) {
    throw new Error('No gif found')
  }

  return { url, failed: false }
}


export function useAnimalGif(query) {
  return useQuery({
    queryKey: ['animalGif', query],
    queryFn: () => fetchAnimalGif(query),
    enabled: !!query,
    staleTime: Infinity,
    retry: false,
  })
}
