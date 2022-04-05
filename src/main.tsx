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

	// 处理函数组件没有 dom 需要向上找到离函数组件最近的一个父元素的 dom
	let domParentFiber = fiber?.parent;

	// FIXME: 这里不判空父元素的话渲染 root 会导致直接死循环，但是 pomber/didact 代码中好像没问题
	while (domParentFiber && !domParentFiber?.dom) {
		domParentFiber = domParentFiber?.parent;
	}

	const domParent = domParentFiber?.dom;

	// 按顺序（ self > child > sibling ）递归渲染元素到 DOM 上
	if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
		// fiber 标识为 PLACEMENT 将元素添加到父元素
		domParent?.appendChild(fiber.dom);
	} else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
		// fiber 标识为 UPDATE 将触发更新元素
		updateDom(fiber.dom, fiber.alternate.props, fiber.props);
	} else if (fiber.effectTag === 'DELETION') {
		// fiber 标识为 DELETION 将触发删除元素
		commitDeletion(fiber, domParent);
	}

	fiber.child && commitWork(fiber.child);
	fiber.sibling && commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber, domParent: any) {
	if (fiber.dom) {
		// 如果 fiber 存在 DOM 组件就将 DOM 从父元素中移除
		domParent.removeChild(fiber.dom);
	} else {
		// 否则递归移除子元素
		if (fiber?.child) commitDeletion(fiber?.child, domParent);
	}
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

function performUnitOfWork(fiber: any): any {
	// 判断是否是函数组件，函数组件和主组件使用不同逻辑处理
	const isFunctionComponent = fiber.type instanceof Function;
	if (isFunctionComponent) {
		updateFunctionComponent(fiber);
	} else {
		updateHostComponent(fiber);
	}

	if (fiber.child) {
		// 存在子元素，下一个任务就是处理子元素
		return fiber.child;
	}

	let nextFiber: any = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			// 存在兄弟元素，下一个任务就是处理兄弟元素
			return nextFiber.sibling;
		}

		// 当兄弟元素处理完了，利用循环向上找父元素的兄弟元素
		nextFiber = nextFiber.parent;
	}
}

function updateHostComponent(fiber: any) {
	if (!fiber.dom) {
		// fiber 不存在 DOM 对象就先创建
		fiber.dom = createDom(fiber);
	}

	// 协调子元素
	reconcileChildren(fiber, fiber?.props?.children);
}

let wipFiber: any = null;
let hooksIndex: any = null;

function updateFunctionComponent(fiber: any) {
	wipFiber = fiber;
	hooksIndex = 0;
	wipFiber.hooks = [];

	// 通过运行函数获得函数组件中的元素
	const children = [fiber.type(fiber?.props)];

	// 协调子元素
	reconcileChildren(fiber, children);
}

function useState<T>(initial: T) {
	const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hooksIndex];
	const hook = {
		state: oldHook ? oldHook.state : initial,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action: any) => {
		hook.state = action(hook.state);
	});

	const setState = (action: T) => {
		hook.queue.push(action as never);
		wipRoot = {
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot,
		};

		nextUnitOfWork = wipRoot;
		deletions = [];
	};

	wipFiber.hooks.push(hook);
	hooksIndex++;
	return [hook.state, setState];
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
	useState,
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

function App(props: any) {
	const [value, setValue] = BinReact.useState(1);
	return (
		<div>
			<h1 onClick={() => setValue((value: number) => value + 1)}>
				Hello {props.name}, you click me count is {value}
			</h1>
		</div>
	);
}
const element = <App name="bin" />;
const container = document.getElementById('root');
BinReact.render(element, container);

// const updateValue = (e: any) => {
// 	rerender(e.target.value);
// };

// const container = document.getElementById('root');
// // ReactDOM.render(element, container);

// const rerender = (value: any) => {
// 	const element = (
// 		<div>
// 			<input onInput={updateValue} value={value} />
// 			<h2>Hello {value}</h2>
// 		</div>
// 	);
// 	BinReact.render(element, container);
// };
// rerender('Bin');
