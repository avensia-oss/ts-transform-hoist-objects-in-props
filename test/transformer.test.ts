import compile from './compile';

type Code = { [fileName: string]: string };

test('simple css prop is hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const Comp = (props: any) => <div />;
export const Xyz = () => <Comp css={{ background: 'red', width: 1, margin: { top: 5, bottom: 5 + 'px' } }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const Comp = (props) => <div />;
export const Xyz = () => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { background: 'red', width: 1, margin: { top: 5, bottom: 5 + 'px' } };
     `,
  };

  expectEqual(expected, compile(code));
});

test('top level JSX is not hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const Comp = (props: any) => <div />;
export const Xyz = <Comp css={{ background: 'red' }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const Comp = (props) => <div />;
export const Xyz = <Comp css={{ background: 'red' }}/>;
     `,
  };

  expectEqual(expected, compile(code));
});

test('onclicks that use class methods are not hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const Comp = (props: any) => <div />;
class MyComp extends React.Component<any> {
    doStuff() {
        alert('hiyoo!');
    }
    render() {
        return <Comp onClick={() => this.doStuff()}/>;
    }
}
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const Comp = (props) => <div />;
class MyComp extends React.Component {
    doStuff() {
        alert('hiyoo!');
    }
    render() {
        return <Comp onClick={() => this.doStuff()}/>;
    }
}
     `,
  };

  expectEqual(expected, compile(code));
});

test('function as prop is hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
import { styleFunc } from './file.ts';
const Comp = (props: any) => <div />;
export const Xyz = () => <Comp css={() => ({ background: 'red' })} style={() => styleFunc()} />;
    `,
    'file.ts': `
export const styleFunc = () => ({ background: 'red' });
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
import { styleFunc } from './file.ts';
const Comp = (props) => <div />;
export const Xyz = () => <Comp css={__$hoisted_o0} style={__$hoisted_o1}/>;
const __$hoisted_o0 = () => ({ background: 'red' });
const __$hoisted_o1 = () => styleFunc();
     `,
    'file.js': `
export const styleFunc = () => ({ background: 'red' });
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with theme function is hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const Comp = (props: any) => <div />;
export const Xyz = () => <Comp css={{ background: 'red', color: theme => theme === 'dark' ? 'black' : 'white' }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const Comp = (props) => <div />;
export const Xyz = () => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { background: 'red', color: theme => theme === 'dark' ? 'black' : 'white' };
     `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with theme function that uses out of scope variable is not hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ background: 'red', color: theme => theme + props.color === 'dark' ? 'black' : 'white' }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={{ background: 'red', color: theme => theme + props.color === 'dark' ? 'black' : 'white' }}/>;
     `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with theme function that uses imported variable gets hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
import { constant } from './file.ts';
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ background: 'red', color: theme => theme + constant === 'dark' ? 'black' : 'white' }} />;
    `,
    'file.ts': `
export const constant = 1;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
import { constant } from './file.ts';
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { background: 'red', color: theme => theme + constant === 'dark' ? 'black' : 'white' };
    `,
    'file.js': `
export const constant = 1;
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with theme function that uses top level const variable gets hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ background: 'red', color: theme => theme + constant === 'dark' ? 'black' : 'white' }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { background: 'red', color: theme => theme + constant === 'dark' ? 'black' : 'white' };
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with theme function that uses top level const object gets hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const constant = { dark: 'black', light: 'white' };
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ background: theme => theme === constant.dark ? 'black' : 'white', color: theme => constant[theme] }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const constant = { dark: 'black', light: 'white' };
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { background: theme => theme === constant.dark ? 'black' : 'white', color: theme => constant[theme] };
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with string expressions with top level const variable gets hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ margin: constant + 'px', padding: \`\${constant}px\` }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { margin: constant + 'px', padding: \`\${constant}px\` };
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with string expressions with top level const object gets hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const constant = { padding: 5, margin: 5 };
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ margin: constant.margin + 'px', padding: \`\${constant.padding}px\` }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const constant = { padding: 5, margin: 5 };
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={__$hoisted_o0}/>;
const __$hoisted_o0 = { margin: constant.margin + 'px', padding: \`\${constant.padding}px\` };
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with prop value used does not get hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ margin: constant + 'px', padding: \`\${props.padding}px\` }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={{ margin: constant + 'px', padding: \`\${props.padding}px\` }}/>;
    `,
  };

  expectEqual(expected, compile(code));
});

test('css prop with prop value as key used does not get hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props: any) => <div />;
export const Xyz = (props: any) => <Comp css={{ margin: constant + 'px', [props.padding]: \`\${constant}px\` }} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const constant = 1;
const Comp = (props) => <div />;
export const Xyz = (props) => <Comp css={{ margin: constant + 'px', [props.padding]: \`\${constant}px\` }}/>;
    `,
  };

  expectEqual(expected, compile(code));
});

test('ternary expression is hoisted', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
const Comp = (props: any) => <div />;
export const Xyz = () => <Comp css={x ? {background: 'red'} : {background: 'blue'}} />;
    `,
  };

  const expected = {
    'component1.jsx': `
import * as React from 'react';
const Comp = (props) => <div />;
export const Xyz = () => <Comp css={x ? __$hoisted_o0 : __$hoisted_o1}/>;
const __$hoisted_o0 = { background: 'red' };
const __$hoisted_o1 = { background: 'blue' };
     `,
  };

  expectEqual(expected, compile(code));
});

function expectEqual(expected: Code, compiled: Code) {
  Object.keys(expected).forEach(fileName => {
    expect(fileName + ':\n' + (compiled[fileName] || '').trim()).toBe(
      fileName + ':\n' + (expected[fileName] || '').trim(),
    );
  });
}
