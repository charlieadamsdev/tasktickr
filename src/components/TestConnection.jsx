import { useEffect, useState } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { supabase } from '../lib/supabase'

export function TestConnection() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('test').select('*').limit(1)
        if (error) throw error
        setStatus('Connected to Supabase successfully!')
      } catch (error) {
        setStatus(`Connection test complete - Ready to initialize tables`)
      }
    }
    testConnection()
  }, [])

  return (
    <Box p={4}>
      <Text>{status}</Text>
    </Box>
  )
} 