import React from 'react'

import { 
  BrowserRouter as Router, Routes, Route
} from "react-router-dom";

import Web from './web.js';

function App() {
  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" exact element={<Web/>}/>
        <Route path="/*" exact element={<Web/>}/>
      </Routes>
    </Router>
  );
}
  
export default App;