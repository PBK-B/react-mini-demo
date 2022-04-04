import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

// const element = <h1 title='foo'>Hello World</h1>;
// const element = React.createElement(
// 	'h1',
// 	{
// 		title: 'foo',
// 	},
// 	'Hello World'
// );
// const element = {
// 	type: 'h1',
// 	props: {
// 		title: 'foo',
// 		children: 'Hello World',
// 	},
// };

// const container = document.getElementById('root');

// ReactDOM.render(element, container);
// const node = document.createElement(element.type);
// node['title'] = element.props.title;

// const text = document.createTextNode('');
// text['nodeValue'] = element.props.children;

// node.appendChild(text);
// container?.appendChild(node);

type BinElement = {
	type: string;
	props?: {
		[propName: string]: any;
		children: Array<object | string>;
	};
};

// 创建文本组件
function createTextElement(text: string): BinElement {
	return {
		type: 'TEXT_ELEMENT',
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

// 创建组件
function createElement(type: string, props: any, ...children: Array<object | string>): BinElement {
	return {
		type,
		props: {
			...props,
			children: children?.map((child: object | string) =>
				typeof child === 'object' ? child : createTextElement(child)
			),
		},
	};
}

function render(element: any, container: HTMLElement | null) {
	const dom = element?.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(element.type);

	// 将除了 children 属性的其他属性设置到 dom 上面
	const isProperty = (key: any) => key !== 'children';
	Object.keys(element.props)
		.filter(isProperty)
		.forEach((name) => {
			dom[name] = element.props[name];
		});

	// 递归渲染子组件
	element.props?.children.forEach((child: any) => {
		render(child, dom);
	});

	container?.appendChild(dom);
}

// 构建一个属于自己的 React 框架
const BinReact = {
	createElement,
	render,
};

// const element = BinReact.createElement(
// 	'div',
// 	{
// 		id: 'foo',
// 	},
// 	React.createElement('a', null, 'bar'),
// 	React.createElement('b')
// );

/** @jsxRuntime classic */
/** @jsx BinReact.createElement */
const element = (
	<div id="foo">
		<a>bar</a>
		<b />
		<p>hello world</p>
	</div>
);

const container = document.getElementById('root');
// ReactDOM.render(element, container);
BinReact.render(element, container);
