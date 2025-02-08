import { type Component } from "solid-js";
import { TierList } from "./Tierlist";
import { MetaProvider, Title } from "@solidjs/meta";

const App: Component = () => {
  return (
    <>
      <MetaProvider>
        <Title>Tierlist Maker</Title>
      </MetaProvider>
      <TierList />;
    </>
  )
};

export default App;
