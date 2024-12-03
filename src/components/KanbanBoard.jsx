import { useState } from 'react'
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  useBreakpointValue, 
  Button,
  Editable,
  EditableInput,
  EditablePreview,
  IconButton,
  useEditableControls
} from '@chakra-ui/react'
import { EditIcon } from '@chakra-ui/icons'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { supabase } from '../lib/supabase'

function EditableControls() {
  const { isEditing, getSubmitButtonProps, getCancelButtonProps, getEditButtonProps } = useEditableControls()
  
  return !isEditing ? (
    <IconButton
      size="sm"
      icon={<EditIcon />}
      variant="ghost"
      {...getEditButtonProps()}
    />
  ) : null
}

const Column = ({ title, tasks, id, onDeleteTask, onEditTask }) => {
  const isVertical = useBreakpointValue({ base: true, md: false })

  return (
    <Box
      width={isVertical ? "100%" : "300px"}
      minH="400px"
      p={4}
      borderWidth="1px"
      borderRadius="lg"
      bg="white"
    >
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        {title} ({tasks.length})
      </Text>
      <Droppable droppableId={id}>
        {(provided) => (
          <VStack
            align="stretch"
            spacing={4}
            {...provided.droppableProps}
            ref={provided.innerRef}
            minH="200px"
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={snapshot.isDragging ? "gray.100" : "white"}
                    shadow={snapshot.isDragging ? "md" : "sm"}
                    position="relative"
                  >
                    <HStack justify="space-between" align="center" width="100%">
                      <Editable 
                        defaultValue={task.title} 
                        width="100%"
                        submitOnBlur={true}
                      >
                        <EditablePreview />
                        <EditableInput 
                          onBlur={(e) => onEditTask(task.id, e.target.value)}
                        />
                        <EditableControls>
                          <IconButton
                            icon={<EditIcon />}
                            size="sm"
                            variant="ghost"
                            aria-label="Edit task"
                            onClick={(e) => {
                              e.stopPropagation();
                              // This will trigger the edit mode
                            }}
                          />
                        </EditableControls>
                      </Editable>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                      >
                        Delete
                      </Button>
                    </HStack>
                  </Box>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </VStack>
        )}
      </Droppable>
    </Box>
  )
}

export function KanbanBoard({ tasks, onTaskMove, onDeleteTask, onEditTask }) {
  const isVertical = useBreakpointValue({ base: true, md: false })

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result

    // Dropped outside a valid droppable
    if (!destination) return

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Use draggableId directly since it's already the UUID string
    const taskId = draggableId
    const sourceColumn = source.droppableId
    const destinationColumn = destination.droppableId

    try {
      // If moving to/from done column, update status
      if (destinationColumn === 'done' || sourceColumn === 'done') {
        const isDone = destinationColumn === 'done'
        onTaskMove(taskId, isDone)
      } else {
        // Update the task's column in Supabase without triggering price update
        const { error } = await supabase
          .from('tasks')
          .update({ 
            column_name: destinationColumn,
            status: false  // Ensure status is false when moving between non-done columns
          })
          .eq('id', taskId)

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
      }
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  // Group tasks by their column
  const getTasksByColumn = (columnId) => {
    return tasks.filter(task => {
      if (columnId === 'done') return task.status
      if (task.status) return false // Don't show completed tasks in other columns
      return task.column_name === columnId || 
        (columnId === 'todo' && !task.column_name) // Default to todo if no column_name
    })
  }

  const columns = {
    todo: {
      id: 'todo',
      title: 'To Do',
      tasks: getTasksByColumn('todo')
    },
    today: {
      id: 'today',
      title: 'Today',
      tasks: getTasksByColumn('today')
    },
    done: {
      id: 'done',
      title: 'Done',
      tasks: getTasksByColumn('done')
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box width="100%" overflowX={isVertical ? "visible" : "auto"}>
        <VStack spacing={4} align="stretch">
          {isVertical ? (
            // Mobile view - vertical stack
            Object.values(columns).map(column => (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={column.tasks}
                onDeleteTask={onDeleteTask}
                onEditTask={onEditTask}
              />
            ))
          ) : (
            // Desktop view - horizontal layout
            <HStack spacing={8} align="start">
              {Object.values(columns).map(column => (
                <Column
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={column.tasks}
                  onDeleteTask={onDeleteTask}
                  onEditTask={onEditTask}
                />
              ))}
            </HStack>
          )}
        </VStack>
      </Box>
    </DragDropContext>
  )
} 