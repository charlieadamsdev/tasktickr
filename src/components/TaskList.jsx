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
      
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: !currentStatus } 
          : task
      ))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  return (
    <Box p={4}>
      <form onSubmit={handleAddTask}>
        <VStack spacing={4}>
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <Button type="submit" colorScheme="blue">
            Add Task
          </Button>
        </VStack>
      </form>
      
      <VStack mt={8} spacing={4}>
        {tasks.map((task) => (
          <Box key={task.id} p={4} borderWidth="1px" borderRadius="lg" width="100%">
            <HStack spacing={4}>
              <Text>{task.title}</Text>
              <Checkbox
                isChecked={task.status}
                onChange={() => toggleTaskStatus(task.id, task.status)}
              />
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
} 