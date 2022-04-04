import React, { useState } from 'react';
import logo from './logo.svg';

const { Provider, Consumer } = React.createContext('defaultValue');

const ProviderComp = (props: any) => {
	return <Provider value={'Hello Bin'}>{props.children}</Provider>;
};

const ConsumerComp = (props: any) => {
	return <Consumer>{props?.children}</Consumer>;
};

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="App">
			<ProviderComp>
				<ConsumerComp>{(value: any) => <p>{value}</p>}</ConsumerComp>
			</ProviderComp>
		</div>
	);
}

export default App;
