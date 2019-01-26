import * as ts from 'typescript';

export const defaultOptions = {
  /**
   * This regex lets you filter which props you want to run the transformation on. It should be save to
   * run it on any props that contain object literals, but if you want to white list or black list props
   * this lets you do that.
   */
  propRegex: /.*/,
};
export type Options = typeof defaultOptions;

type LiteralsToHoist = ts.ObjectLiteralExpression[];

export default function transformer(
  program: ts.Program,
  options: Partial<Options> = defaultOptions,
): ts.TransformerFactory<ts.SourceFile> {
  const fullOptions = {
    ...defaultOptions,
    ...options,
  };
  const literalsToHoist: LiteralsToHoist = [];
  return (context: ts.TransformationContext) => (file: ts.SourceFile) =>
    visitNodeAndChildren(file, program, context, literalsToHoist, fullOptions);
}

function visitNodeAndChildren(
  node: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
  literalsToHoist: LiteralsToHoist,
  options: Options,
): ts.SourceFile;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
  literalsToHoist: LiteralsToHoist,
  options: Options,
): ts.Node | ts.Node[];
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
  literalsToHoist: LiteralsToHoist,
  options: Options,
): ts.Node | ts.Node[] {
  const transformedNode = ts.visitEachChild(
    visitNode(node, program, literalsToHoist, options),
    childNode => visitNodeAndChildren(childNode, program, context, literalsToHoist, options),
    context,
  );

  if (ts.isSourceFile(transformedNode) && literalsToHoist.length) {
    const declarations = literalsToHoist.map(literal => {
      return ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
          [ts.createVariableDeclaration('__$hoisted_o' + literalsToHoist.indexOf(literal), undefined, literal)],
          ts.NodeFlags.Const,
        ),
      );
    });
    literalsToHoist.length = 0;

    return injectHoistedDeclarations(transformedNode, declarations);
  }

  return transformedNode;
}

function visitNode(
  node: ts.Node,
  program: ts.Program,
  literalsToHoist: LiteralsToHoist,
  options: Options,
): any /* TODO */ {
  if (
    ts.isObjectLiteralExpression(node) &&
    ((ts.isJsxExpression(node.parent) &&
      ts.isJsxAttribute(node.parent.parent) &&
      options.propRegex.test(node.parent.parent.name.text)) ||
      (ts.isConditionalExpression(node.parent) &&
        ts.isJsxExpression(node.parent.parent) &&
        ts.isJsxAttribute(node.parent.parent.parent) &&
        options.propRegex.test(node.parent.parent.parent.name.text))) &&
    isLiteral(node, program.getTypeChecker())
  ) {
    const variableName = '__$hoisted_o' + literalsToHoist.length;
    literalsToHoist.push(node);
    return ts.createIdentifier(variableName);
  }

  return node;
}

function injectHoistedDeclarations(sourceFile: ts.SourceFile, statementsToAppend: ts.Statement[]): ts.SourceFile {
  return {
    ...sourceFile,
    statements: ts.createNodeArray([...sourceFile.statements, ...statementsToAppend]),
  };
}

function isLiteral(objectLiteral: ts.ObjectLiteralExpression, typeChecker: ts.TypeChecker) {
  return objectLiteral.properties.every(p => {
    return (
      ts.isPropertyAssignment(p) &&
      (ts.isStringLiteral(p.initializer) ||
        ts.isNumericLiteral(p.initializer) ||
        ((ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer)) &&
          functionIsPure(p.initializer, typeChecker)))
    );
  });
}

function functionIsPure(func: ts.ArrowFunction | ts.FunctionExpression, typeChecker: ts.TypeChecker) {
  const usedIdentifiers: ts.Identifier[] = [];
  const localDeclarations: string[] = [];
  const visitFunctionBody = (node: ts.Node) => {
    if (ts.isIdentifier(node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) {
      usedIdentifiers.push(node);
    }
    if (ts.isVariableDeclaration(node)) {
      if (ts.isIdentifier(node.name)) {
        localDeclarations.push(node.name.text);
      } else if (ts.isArrayBindingPattern(node.name) || ts.isObjectBindingPattern(node.name)) {
        node.name.elements.forEach(e => {
          if (ts.isBindingElement(e) && ts.isIdentifier(e.name)) {
            localDeclarations.push(e.name.text);
          }
        });
      }
    }
    ts.forEachChild(node, visitFunctionBody);
  };
  ts.forEachChild(func.body, visitFunctionBody);
  const params = getParamNames(func.parameters);
  const identifiersNotDeclaredInFunc = usedIdentifiers.filter(i => localDeclarations.indexOf(i.text) === -1);
  const identifiersNotDeclaredInFuncAndNotAParam = identifiersNotDeclaredInFunc.filter(
    i => params.indexOf(i.text) === -1,
  );

  if (!identifiersNotDeclaredInFuncAndNotAParam.length) {
    return true;
  } else {
    return identifiersNotDeclaredInFuncAndNotAParam.every(i => isSafeToHoist(i, typeChecker));
  }
}

function isSafeToHoist(identifier: ts.Identifier, typeChecker: ts.TypeChecker) {
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (symbol && symbol.declarations.length) {
    const decl = symbol.declarations[0];
    if (
      ts.isImportSpecifier(decl) ||
      (ts.isVariableDeclaration(decl) &&
        ts.isVariableDeclarationList(decl.parent) &&
        ts.isVariableStatement(decl.parent.parent) &&
        ts.isSourceFile(decl.parent.parent.parent))
    ) {
      return true;
    }
  }
  return false;
}

function getParamNames(params: ts.NodeArray<ts.ParameterDeclaration>) {
  const paramNames: string[] = [];
  params.forEach(p => {
    if (ts.isIdentifier(p.name)) {
      paramNames.push(p.name.text);
    } else if (ts.isArrayBindingPattern(p) || ts.isObjectBindingPattern(p)) {
      p.elements.forEach(e => {
        if (ts.isBindingElement(e) && ts.isIdentifier(e.name)) {
          paramNames.push(e.name.text);
        }
      });
    }
  });
  return paramNames;
}
