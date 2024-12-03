import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Box, Heading, VStack, Container } from '@chakra-ui/react'
import { TestConnection } from './components/TestConnection'
import { TaskList } from './components/TaskList'
import { StockPrice } from './components/StockPrice'
import { PriceChart } from './components/PriceChart'

function App() {
  return (
    <Router>
      <Container maxW="1400px" p={4}>
        <Heading mb={4}>TaskTickr</Heading>
        <TestConnection />
        <VStack spacing={8} width="100%" align="stretch">
          <StockPrice />
          <PriceChart />
          <Routes>
            <Route path="/" element={<TaskList />} />
          </Routes>
        </VStack>
      </Container>
    </Router>
  )
}

export default App
