import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box, Heading, VStack } from '@chakra-ui/react'
import { TestConnection } from './components/TestConnection'
import { TaskList } from './components/TaskList'
import { StockPrice } from './components/StockPrice'

function App() {
  return (
    <Router>
      <Box p={4}>
        <Heading mb={4}>TaskTickr</Heading>
        <TestConnection />
        <VStack spacing={8}>
          <StockPrice />
          <Routes>
            <Route path="/" element={<TaskList />} />
          </Routes>
        </VStack>
      </Box>
    </Router>
  )
}

export default App
