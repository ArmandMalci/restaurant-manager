import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app root without crashing', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows the app name', () => {
    render(<App />)
    expect(screen.getByText(/restaurant manager/i)).toBeInTheDocument()
  })
})
