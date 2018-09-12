/**
 *  Copyright (c) Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * ExecuteButton
 *
 * What a nice round shiny button. Shows a drop-down when there are multiple
 * queries to run.
 */
export class TestButton extends React.Component {
  static propTypes = {
    onClickTest: PropTypes.func,
    onClickAllParameters: PropTypes.func,
    onClickNewQuery: PropTypes.func,
    onClickAppendQuery: PropTypes.func,
    allowAppend: PropTypes.bool,
    allowAllArgs: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = { optionsOpen: false };
  }

  render() {
    return (
      <div onKeyPress={this.handleKeyPressed}>
        <div className="test-button-container">
          <button className="test-button" onClick={this.props.onClickTest}>
            {'{...}'}
          </button>
          <button
            className="test-button"
            onClick={() =>
              this.setState({ optionsOpen: !this.state.optionsOpen })}>
            {'▾'}
          </button>
        </div>
        {this.state.optionsOpen &&
          <ul className="test-button-options">
            <li
              onClick={() => {
                this.props.onClickNewQuery();
                this.setState({ optionsOpen: false });
              }}>
              {'(...) with all parameters'}
            </li>
          </ul>}
      </div>
    );
  }
}
