import { useState, useEffect } from 'react'
import { Box, VStack, Input, Button, Text, Checkbox, HStack } from '@chakra-ui/react'
import { supabase } from '../lib/supabase'

export function TaskList() {
  const [newTask, setNewTask] = useState('')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTask.trim()) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title: newTask.trim(), status: false }])
        .select()

      if (error) throw error
      setTasks([data[0], ...tasks])
      setNewTask('')
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const toggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null 
        })
        .eq('id', taskId)

      if (error) throw error
      
      // Update local task state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : null }
          : task
      ))

      // Calculate and update stock price
      console.log('Calculating new price, current status:', !currentStatus)
      await calculateNewPrice(!currentStatus)
      
    } catch (error) {
      console.error('Error toggling task status:', error)
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      setTasks(tasks.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const calculateNewPrice = async (currentStatus) => {
    try {
      console.log('Starting price calculation:', { currentStatus })
      
      const { data: priceData, error: priceError } = await supabase
        .from('stock_prices')
        .select('*')
        .limit(1)
        .single()

      if (priceError) throw priceError
      
      console.log('Current price record:', priceData)

      const currentPrice = priceData?.price || 10
      const newPrice = currentStatus 
        ? currentPrice * 1.05  // +5% when completing
        : currentPrice * 0.97  // -3% when unchecking

      console.log('Price calculation:', {
        currentPrice,
        newPrice,
        change: newPrice - currentPrice
      })

      const { data: updateData, error: updateError } = await supabase
        .from('stock_prices')
        .update({ price: Number(newPrice.toFixed(2)) })
        .eq('id', priceData.id)
        .select()

      if (updateError) throw updateError
      
      console.log('Price update result:', updateData)
      
      return newPrice
    } catch (error) {
      console.error('Error updating stock price:', error)
      return null
    }
  }

  return (
    <Box>
      <form onSubmit={handleAddTask}>
        <VStack spacing={4}>
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
          />
          <Button type="submit" colorScheme="blue">
            Add Task
          </Button>
        </VStack>
      </form>
      
      <VStack mt={8} spacing={4}>
        {tasks.map((task) => (
          <Box key={task.id} p={4} borderWidth="1px" borderRadius="lg" width="100%">
            <HStack spacing={4} justify="space-between">
              <HStack spacing={4}>
                <Checkbox 
                  isChecked={task.status} 
                  onChange={() => toggleTaskStatus(task.id, task.status)}
                />
                <Text textDecoration={task.status ? 'line-through' : 'none'}>
                  {task.title}
                </Text>
              </HStack>
              <Button
                size="sm"
                colorScheme="red"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
} 