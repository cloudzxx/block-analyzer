export interface Provider {
  name: string
  request<T>(params: Record<string, string>): Promise<T>
}
