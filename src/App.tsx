import { type Component } from "solid-js";
import { TierList } from "./Tierlist";
import { Analytics } from "./Analytics";

const App: Component = () => {
  return (
    <>
      <Analytics />
      <TierList />;
    </>
  );
};

export default App;
