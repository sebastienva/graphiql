/**
 *  Copyright (c) Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';

import TypeLink from './TypeLink';
import MarkdownContent from './MarkdownContent';

// Render the top level Schema
export default class SchemaDoc extends React.Component {
  static propTypes = {
    schema: PropTypes.object,
    onClickType: PropTypes.func,
  };

  shouldComponentUpdate(nextProps) {
    return this.props.schema !== nextProps.schema;
  }

  render() {
    const schema = this.props.schema;
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType && schema.getMutationType();
    const subscriptionType =
      schema.getSubscriptionType && schema.getSubscriptionType();

    return (
      <div>
        <MarkdownContent
          className="doc-type-description"
          markdown={
            'A GraphQL schema provides a root type for each kind of operation.'
          }
        />
        <div className="doc-category">
          <div className="doc-category-title">
            {'root types'}
          </div>
          <div className="doc-category-item">
            <span className="keyword">{'query'}</span>
            {': '}
            <TypeLink
              field="query"
              type={queryType}
              onClick={this.props.onClickType}
            />
          </div>
          {mutationType &&
            <div className="doc-category-item">
              <span className="keyword">{'mutation'}</span>
              {': '}
              <TypeLink
                field="mutation"
                type={mutationType}
                onClick={this.props.onClickType}
              />
            </div>}
          {subscriptionType &&
            <div className="doc-category-item">
              <span className="keyword">{'subscription'}</span>
              {': '}
              <TypeLink
                field="subscription"
                type={subscriptionType}
                onClick={this.props.onClickType}
              />
            </div>}
        </div>
      </div>
    );
  }
}
