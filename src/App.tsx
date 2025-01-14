import { type Component } from 'solid-js';
import { TierList } from './Tierlist';

const App: Component = () => {
  return (
    <div class="w-screen h-screen bg-gray-800">
      <TierList />
    </div>
  );
};

export default App;
