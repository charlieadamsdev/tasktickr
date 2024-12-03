import { useState, useEffect } from 'react'
import { Box, VStack, Input, Button } from '@chakra-ui/react'
import { supabase } from '../lib/supabase'
import { KanbanBoard } from './KanbanBoard'

export function TaskList() {
  const [newTask, setNewTask] = useState('')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchTasks()

    // Set up real-time subscription for tasks
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (insert, update, delete)
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Task change detected:', payload)
          
          // Handle different types of changes
          switch (payload.eventType) {
            case 'INSERT':
              setTasks(current => [payload.new, ...current])
              break
            case 'UPDATE':
              setTasks(current =>
                current.map(task =>
                  task.id === payload.new.id ? payload.new : task
                )
              )
              break
            case 'DELETE':
              setTasks(current =>
                current.filter(task => task.id !== payload.old.id)
              )
              break
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
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
        .insert([{ 
          title: newTask.trim(), 
          status: false,
          column_name: 'todo'
        }])
        .select()

      if (error) throw error
      setTasks([data[0], ...tasks])
      setNewTask('')
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleTaskMove = async (taskId, isDone) => {
    try {
      // Get the current task to check last_price_change
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('last_price_change')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError

      // Update task status
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: isDone,
          completed_at: isDone ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error
      
      // Update local task state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: isDone, 
              completed_at: isDone ? new Date().toISOString() : null
            }
          : task
      ))

      // Calculate new price based on status change
      await calculateNewPrice(isDone, taskId, taskData.last_price_change)
      
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const calculateNewPrice = async (currentStatus, taskId, lastPriceChange) => {
    try {
      console.log('Starting price calculation:', { currentStatus, lastPriceChange })
      
      const { data: priceData, error: priceError } = await supabase
        .from('stock_prices')
        .select('*')
        .limit(1)
        .single()

      if (priceError) throw priceError
      
      const currentPrice = priceData?.price || 10
      let newPrice, priceChange

      if (currentStatus) {
        // Task being completed - add 5%
        priceChange = currentPrice * 0.05
        newPrice = currentPrice + priceChange
        
        // Store the price change amount and add to price history
        await Promise.all([
          supabase
            .from('tasks')
            .update({ last_price_change: priceChange })
            .eq('id', taskId),
          supabase
            .from('price_history')
            .insert({
              price: newPrice,
              task_id: taskId,
              change_type: 'completion',
              price_change: priceChange
            })
        ])
      } else {
        // Task being unchecked - remove the exact amount that was added
        newPrice = currentPrice - lastPriceChange
        
        // Reset the stored price change and add to price history
        await Promise.all([
          supabase
            .from('tasks')
            .update({ last_price_change: null })
            .eq('id', taskId),
          supabase
            .from('price_history')
            .insert({
              price: newPrice,
              task_id: taskId,
              change_type: 'uncomplete',
              price_change: -lastPriceChange
            })
        ])
      }

      console.log('Price calculation:', {
        currentPrice,
        newPrice,
        change: newPrice - currentPrice
      })

      const { error: updateError } = await supabase
        .from('stock_prices')
        .update({ price: Number(newPrice.toFixed(2)) })
        .eq('id', priceData.id)

      if (updateError) throw updateError
      
      return newPrice
    } catch (error) {
      console.error('Error updating stock price:', error)
      return null
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      // Local state will be updated automatically through the real-time subscription
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  return (
    <Box width="100%">
      <form onSubmit={handleAddTask}>
        <VStack spacing={4} mb={8}>
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
      
      <KanbanBoard 
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onDeleteTask={handleDeleteTask}
      />
    </Box>
  )
} 