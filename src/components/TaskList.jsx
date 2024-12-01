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
          ? { ...task, status: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : null }
          : task
      ))
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