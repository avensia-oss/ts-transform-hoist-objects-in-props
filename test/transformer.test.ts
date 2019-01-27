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
