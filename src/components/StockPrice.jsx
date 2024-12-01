import { useState, useEffect } from 'react'
import { Box, Text, VStack, Stat, StatLabel, StatNumber, StatArrow, HStack } from '@chakra-ui/react'
import { supabase } from '../lib/supabase'

export function StockPrice() {
  const [currentPrice, setCurrentPrice] = useState(10)
  const [lastPrice, setLastPrice] = useState(null)
  const [priceDirection, setPriceDirection] = useState(null)
  const [lastChange, setLastChange] = useState(null)

  useEffect(() => {
    console.log('Setting up real-time subscription...')
    fetchLatestPrice()

    const channel = supabase
      .channel('stock_prices_changes')
      .on(
        'postgres_changes',
        { 
          event: '*',
          schema: 'public', 
          table: 'stock_prices'
        },
        (payload) => {
          console.log('Subscription payload:', payload)
          
          if (payload.new && typeof payload.new.price === 'number') {
            const newPrice = Number(payload.new.price)
            const oldPrice = currentPrice
            console.log('Price update:', { oldPrice, newPrice })
            
            setLastPrice(oldPrice)
            setCurrentPrice(newPrice)
            setPriceDirection(newPrice > oldPrice)
            setLastChange(Math.abs(newPrice - oldPrice))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentPrice])

  async function fetchLatestPrice() {
    try {
      console.log('Fetching latest price...')
      const { data, error } = await supabase
        .from('stock_prices')
        .select('price')
        .limit(1)
        .single()

      if (error) throw error
      
      if (data && typeof data.price === 'number') {
        const price = Number(data.price)
        setCurrentPrice(price)
        setLastPrice(price)  // Initialize lastPrice
      }
    } catch (error) {
      console.error('Error fetching price:', error)
    }
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={4}>
        <Stat>
          <StatLabel>Current Stock Price</StatLabel>
          <StatNumber>${Number(currentPrice).toFixed(2)}</StatNumber>
          {lastChange !== null && (
            <HStack spacing={2} justify="center">
              <StatArrow 
                type={priceDirection ? 'increase' : 'decrease'} 
              />
              <Text 
                fontSize="sm" 
                color={priceDirection ? 'green.500' : 'red.500'}
              >
                {lastChange.toFixed(2)} ({(lastChange / (currentPrice - lastChange) * 100).toFixed(1)}%)
              </Text>
            </HStack>
          )}
        </Stat>
      </VStack>
    </Box>
  )
}
