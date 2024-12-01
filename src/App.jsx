import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box, Heading } from '@chakra-ui/react'
import { TestConnection } from './components/TestConnection'
import { TaskList } from './components/TaskList'

function App() {
  return (
    <Router>
      <Box p={4}>
        <Heading mb={4}>TaskTickr</Heading>
        <TestConnection />
        <Routes>
          <Route path="/" element={<TaskList />} />
        </Routes>
      </Box>
    </Router>
  )
}

export default App
