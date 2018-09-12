/**
 *  Copyright (c) Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  GraphQLSchema,
  isType,
  getNamedType,
  GraphQLNonNull,
  GraphQLInputObjectType,
  parse,
} from 'graphql';

import FieldDoc from './DocExplorer/FieldDoc';
import SchemaDoc from './DocExplorer/SchemaDoc';
import SearchBox from './DocExplorer/SearchBox';
import SearchResults from './DocExplorer/SearchResults';
import TypeDoc from './DocExplorer/TypeDoc';

const initialNav = {
  name: 'Schema',
  title: 'Documentation Explorer',
};

/**
 * DocExplorer
 *
 * Shows documentations for GraphQL definitions from the schema.
 *
 * Props:
 *
 *   - schema: A required GraphQLSchema instance that provides GraphQL document
 *     definitions.
 *
 * Children:
 *
 *   - Any provided children will be positioned in the right-hand-side of the
 *     top bar. Typically this will be a "close" button for temporary explorer.
 *
 */
export class DocExplorer extends React.Component {
  static propTypes = {
    schema: PropTypes.instanceOf(GraphQLSchema),
    onGenerateQuery: PropTypes.func,
  };

  constructor() {
    super();

    this.state = { navStack: [initialNav] };
    this.currentFields = [];
    this.selectedArgs = [];
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      this.props.schema !== nextProps.schema ||
      this.state.navStack !== nextState.navStack
    );
  }

  render() {
    const schema = this.props.schema;
    const navStack = this.state.navStack;
    const navItem = navStack[navStack.length - 1];

    let content;
    if (schema === undefined) {
      // Schema is undefined when it is being loaded via introspection.
      content = (
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      );
    } else if (!schema) {
      // Schema is null when it explicitly does not exist, typically due to
      // an error during introspection.
      content = (
        <div className="error-container">
          {'No Schema Available'}
        </div>
      );
    } else if (navItem.search) {
      content = (
        <SearchResults
          searchValue={navItem.search}
          withinType={navItem.def}
          schema={schema}
          onClickType={this.handleClickType}
          onClickField={this.handleClickField}
        />
      );
    } else if (navStack.length === 1) {
      content = (
        <SchemaDoc schema={schema} onClickType={this.handleClickType} />
      );
    } else if (isType(navItem.def)) {
      content = (
        <TypeDoc
          schema={schema}
          type={navItem.def}
          onClickType={this.handleClickType}
          onClickField={this.handleClickField}
          onClickTest={this.handleClickTest}
        />
      );
    } else {
      content = (
        <FieldDoc
          field={navItem.def}
          onClickType={this.handleClickType}
          onClickTest={this.handleClickTest}
        />
      );
    }

    const shouldSearchBoxAppear =
      navStack.length === 1 || (isType(navItem.def) && navItem.def.getFields);

    let prevName;
    if (navStack.length > 1) {
      prevName = navStack[navStack.length - 2].name;
    }

    return (
      <div className="doc-explorer" key={navItem.name}>
        <div className="doc-explorer-title-bar">
          {prevName &&
            <div
              className="doc-explorer-back"
              onClick={this.handleNavBackClick}>
              {prevName}
            </div>}
          <div className="doc-explorer-title">
            {navItem.title || navItem.name}
          </div>
          <div className="doc-explorer-rhs">
            {this.props.children}
          </div>
        </div>
        <div className="doc-explorer-contents">
          {shouldSearchBoxAppear &&
            <SearchBox
              value={navItem.search}
              placeholder={`Search ${navItem.name}...`}
              onSearch={this.handleSearch}
            />}
          {content}
        </div>
      </div>
    );
  }

  // Public API
  showDoc(typeOrField, field, arg) {
    this.currentFields = [];
    const navStack = this.state.navStack;
    const topNav = navStack[navStack.length - 1];
    if (topNav.def !== typeOrField) {
      this.setState({
        navStack: navStack.concat([
          {
            name: typeOrField.name,
            def: typeOrField,
            field,
            arg,
          },
        ]),
      });
    }
  }

  // Public API
  showDocForReference(reference) {
    if (reference.kind === 'Type') {
      this.showDoc(reference.type);
    } else if (reference.kind === 'Field') {
      this.showDoc(reference.field);
    } else if (reference.kind === 'Argument' && reference.field) {
      this.showDoc(reference.field);
    } else if (reference.kind === 'EnumValue' && reference.type) {
      this.showDoc(reference.type);
    }
  }

  // Public API
  showSearch(search) {
    const navStack = this.state.navStack.slice();
    const topNav = navStack[navStack.length - 1];
    navStack[navStack.length - 1] = { ...topNav, search };
    this.setState({ navStack });
  }

  reset() {
    this.setState({ navStack: [initialNav] });
  }

  handleNavBackClick = () => {
    // todo : should look level and reset if we try to add to different level instead of erase
    this.currentFields = [];
    if (this.state.navStack.length > 1) {
      this.setState({ navStack: this.state.navStack.slice(0, -1) });
    }
  };

  handleClickType = (type, relatedField, event, arg) => {
    this.showDoc(type, relatedField, arg);
  };

  handleClickField = field => {
    this.showDoc(field, field);
  };

  buildDocument(definitions) {
    return {
      kind: 'Document',
      definitions,
    };
  }

  buildOperationDefinition(options) {
    return {
      kind: 'OperationDefinition',
      ...options,
    };
  }

  buildAst(kind, options) {
    return {
      kind,
      ...options,
    };
  }

  buildName(value) {
    return {
      kind: 'Name',
      value,
    };
  }

  getArgsFromType(type, allParameters) {
    const realType = getNamedType(type);
    if (realType instanceof GraphQLInputObjectType) {
      const typeFields = realType.getFields();

      const argFields = Object.keys(typeFields).map(typeFieldName => {
        const argField = typeFields[typeFieldName];
        if (allParameters || argField.type instanceof GraphQLNonNull) {
          return this.buildAst('ObjectField', {
            name: this.buildName(typeFieldName),
            value: this.buildAst('NullValue'),
          });
        }
      });

      return this.buildAst('ObjectValue', {
        fields: argFields,
      });
    }

    return this.buildAst('NullValue');
  }

  handleClickTest = (
    currentField,
    arg,
    allParameters = true,
    newQuery = true,
    appendQuery = false,
  ) => {
    // this doesn't work inside a search
    if (this.state.navStack.find(({ search }) => search)) {
      return;
    }

    if (newQuery) {
      this.currentFields = [];
      this.currentQueryName = null;
    }

    // dont keep selected fields
    if (!appendQuery) {
      this.currentFields = [];
    }

    // dont push the same
    if (
      this.currentFields.findIndex(
        field => field.name === currentField.name,
      ) === -1
    ) {
      this.currentFields.push(currentField);
    }

    // flat fields
    const fields = [];
    // insideArg is used to detect when we navigate throw args
    let insideArg = false;

    for (let i = 2; i < this.state.navStack.length; i++) {
      const nav = this.state.navStack[i];
      if (nav.arg) {
        insideArg = true;
      }
      if (nav.field) {
        fields.unshift(this.state.navStack[i]);
      }
    }

    if (!arg) {
      fields.unshift({ field: this.currentFields });
    } else {
      this.selectedArgs.push(arg);
    }

    let curSelectionSet = null;
    let curField = null;

    let curArg = null;

    fields.forEach(nav => {
      if (nav.arg) {
        curArg = this.buildAst('Argument', {
          name: this.buildName(nav.arg),
          value: curField
            ? this.buildAst('ObjectValue', {
                fields: [curField],
              })
            : this.buildAst('NullValue'),
        });
        insideArg = false;
      }

      const navFields = Array.isArray(nav.field) ? nav.field : [nav.field];
      if (!insideArg) {
        const astFields = [];
        navFields.forEach(navField => {
          if (navField.args && navField.args.length && curArg === null) {
            curArg = [];
            navField.args.forEach(arg => {
              if (
                allParameters ||
                arg.type instanceof GraphQLNonNull ||
                this.selectedArgs.indexOf(arg.name) !== -1
              ) {
                const value = this.getArgsFromType(arg.type, allParameters);

                curArg.push(
                  this.buildAst('Argument', {
                    name: this.buildName(arg.name),
                    value,
                  }),
                );
              }
            });
          }

          astFields.push(
            this.buildAst('Field', {
              name: this.buildName(navField.name),
              selectionSet: curSelectionSet, // set the previous one
              arguments: curArg ? [curArg] : null,
            }),
          );

          curArg = null; // clean current args
        });

        curSelectionSet = this.buildAst('SelectionSet', {
          selections: astFields,
        });
      } else {
        // inside arg there is  ObjectField instead of Field
        let value = null;

        if (curField) {
          curField = this.buildAst('ObjectField', {
            name: this.buildName(navFields[0].name),
            value: this.buildAst('ObjectValue', {
              fields: curField,
            }),
          });
        } else {
          // only one last level we set null value
          // we also allow to select multiple fields
          value = this.buildAst('NullValue');

          curField = navFields.map(navField => {
            if (navField.type instanceof GraphQLInputObjectType) {
              value = this.getArgsFromType(navField.type);
            }

            return this.buildAst('ObjectField', {
              name: this.buildName(navField.name),
              value,
            });
          });
        }
      }
    });

    if (!this.currentQueryName) {
      let queryNumber;
      try {
        queryNumber = parse(this.props.currentQuery).definitions.length + 1;
      } catch (e) {
        queryNumber = 1;
      }

      this.currentQueryName = currentField.name + '_' + queryNumber;
    }

    const ast = this.buildDocument([
      this.buildOperationDefinition({
        operation: this.state.navStack[1].field,
        name: this.buildName(this.currentQueryName),
        selectionSet: curSelectionSet,
      }),
    ]);

    this.props.onGenerateQuery(ast, newQuery);
  };

  handleSearch = value => {
    this.showSearch(value);
  };
}
