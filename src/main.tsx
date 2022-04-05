import React from 'react';
import ReactDOM from 'react-dom';
// import './index.css';

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

type Fiber = {
	type: string;
	dom?: any;
	alternate?: any;
	props?: {
		[propName: string]: any;
		children: Array<any>;
	};
	parent?: Fiber;
	child?: Fiber;
	sibling?: Fiber;
	effectTag?: string;
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

function createDom(fiber: Fiber): Text | HTMLElement {
	const dom: any = fiber?.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type);

	updateDom(dom, {}, fiber.props);

	return dom;
}

const isEvent = (key: any) => key.startsWith('on');
const isProperty = (key: any) => key !== 'children' && !isEvent(key);
const isNew = (prev: any, next: any) => (key: string) => prev[key] !== next[key];
const isGone = (prev: any, next: any) => (key: string) => !(key in next);
function updateDom(dom: any, prevProps: any, nextProps: any) {
	// 删除旧的或更新事件侦听器
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[name]);
		});

	// 删除旧属性
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => {
			dom[name] = '';
		});

	// 设置新的或更新属性
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			dom[name] = nextProps[name];
		});

	// 添加事件侦听器
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.addEventListener(eventType, nextProps[name]);
		});
}

function commitRoot() {
	deletions.forEach(commitWork);
	commitWork(wipRoot); // 提交渲染 Fiber 到 DOM
	currentRoot = wipRoot;
	wipRoot = null;
}

function commitWork(fiber: Fiber) {
	if (!fiber) {
		return;
	}

	const domParent = fiber?.parent?.dom;

	// 按顺序（ self > child > sibling ）递归渲染元素到 DOM 上
	if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
		// fiber 标识为 PLACEMENT 将元素添加到父元素
		domParent.appendChild(fiber.dom);
	} else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
		// fiber 标识为 UPDATE 将触发更新元素
		updateDom(fiber.dom, fiber.alternate.props, fiber.props);
	} else if (fiber.effectTag === 'DELETION') {
		// fiber 标识为 DELETION 将触发删除元素
		domParent.removeChild(fiber.dom);
	}

	fiber.child && commitWork(fiber.child);
	fiber.sibling && commitWork(fiber.sibling);
}

function render(element: any, container: HTMLElement | null) {
	// render 的时候将初始工作单元设置为 root
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};

	deletions = [];
	nextUnitOfWork = wipRoot;
}

let currentRoot: any = null;
let wipRoot: any = null;
let nextUnitOfWork: any = null;
let deletions: any[] = [];

function workLoop(deadline: IdleDeadline) {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	if (!nextUnitOfWork && wipRoot) {
		// 如果没有任何工作单元且 Root 元素还没有渲染的话，立即渲染 Root 元素
		commitRoot();
	}

	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber): any {
	// 创建 fiber 的 DOM 对象
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	// 给每个子元素创建一个 Fiber 对象
	const elements = fiber.props?.children || [];
	reconcileChildren(fiber, elements);

	if (fiber.child) {
		return fiber.child;
	}

	let nextFiber: any = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
}

function reconcileChildren(wipFiber: Fiber, elements: any[]) {
	let index = 0;
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling: any = null;

	while (index < elements?.length || oldFiber != null) {
		const element = elements[index];

		let newFiber: Fiber | null = null;

		// 这里将新旧 fiber 树进行 diff 比较
		const sameType = oldFiber && element && element.type === oldFiber.type;

		if (sameType) {
			// 如果元素类型相同，保留元素 DOM，使用新的 props
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: 'UPDATE',
			};
		}

		if (element && !sameType) {
			// 如果元素类型不同且有一个新的元素，创建新元素的 DOM
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
				effectTag: 'PLACEMENT',
			};
		}

		if (oldFiber && !sameType) {
			// 如果元素类型不同且存在旧元素，将删除旧元素 DOM
			oldFiber.effectTag = 'DELETION';
			deletions.push(oldFiber);
		}

		if (oldFiber) {
			// 如果是处理对比旧 Fiber 的话，完成当前元素对比之后将对比移动到 sibling 元素
			oldFiber = oldFiber.sibling;
		}

		if (newFiber) {
			if (index === 0) {
				wipFiber.child = newFiber;
			} else {
				prevSibling.sibling = newFiber;
			}
		}

		prevSibling = newFiber;
		index++;
	}
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

const updateValue = (e: any) => {
	rerender(e.target.value);
};

const container = document.getElementById('root');
// ReactDOM.render(element, container);

const rerender = (value: any) => {
	const element = (
		<div>
			<input onInput={updateValue} value={value} />
			<h2>Hello {value}</h2>
		</div>
	);
	BinReact.render(element, container);
};

rerender('Bin');
