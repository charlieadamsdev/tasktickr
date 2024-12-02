import { useState, useEffect } from 'react'
import { Box, Heading, Select } from '@chakra-ui/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

export function PriceChart() {
  const [priceHistory, setPriceHistory] = useState([])
  const [timeRange, setTimeRange] = useState('1d') // 1d, 1w, 1m

  useEffect(() => {
    fetchPriceHistory()

    // Set up real-time subscription
    const channel = supabase
      .channel('price_history_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'price_history'
        },
        (payload) => {
          console.log('New price history entry:', payload)
          
          // Add the new price point to the chart
          const newRecord = {
            timestamp: new Date(payload.new.timestamp).toLocaleTimeString(),
            price: payload.new.price,
            change: payload.new.price_change
          }
          
          setPriceHistory(currentHistory => {
            // Only add if within the selected time range
            const recordDate = new Date(payload.new.timestamp)
            const now = new Date()
            let startDate = new Date()
            
            switch(timeRange) {
              case '1d':
                startDate.setDate(now.getDate() - 1)
                break
              case '1w':
                startDate.setDate(now.getDate() - 7)
                break
              case '1m':
                startDate.setMonth(now.getMonth() - 1)
                break
              default:
                startDate.setDate(now.getDate() - 1)
            }
            
            if (recordDate >= startDate) {
              return [...currentHistory, newRecord]
            }
            return currentHistory
          })
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [timeRange])

  const fetchPriceHistory = async () => {
    try {
      // Calculate the start date based on selected range
      const now = new Date()
      let startDate = new Date()
      
      switch(timeRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1)
          break
        case '1w':
          startDate.setDate(now.getDate() - 7)
          break
        case '1m':
          startDate.setMonth(now.getMonth() - 1)
          break
        default:
          startDate.setDate(now.getDate() - 1)
      }

      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true })

      if (error) throw error

      // Format data for the chart
      const formattedData = data.map(record => ({
        timestamp: new Date(record.timestamp).toLocaleTimeString(),
        price: record.price,
        change: record.price_change
      }))

      setPriceHistory(formattedData)
    } catch (error) {
      console.error('Error fetching price history:', error)
    }
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" width="100%" maxWidth="1200px" mx="auto">
      <Heading size="md" mb={4}>Price History</Heading>
      <Select
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value)}
        mb={4}
        maxWidth="200px"
      >
        <option value="1d">Last 24 Hours</option>
        <option value="1w">Last Week</option>
        <option value="1m">Last Month</option>
      </Select>
      
      <Box height="400px" width="100%">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceHistory} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              domain={[0, 50]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3182ce"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
} 