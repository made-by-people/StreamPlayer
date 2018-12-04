// @flow
import React, { Component } from "react";
import type { Client, Stream } from "../types/agora.js";
import { SignalIcon } from "./decorations";
import { xor } from "./utils";
import AgoraIcon from "./assets/agora.png";
import './style.css';

type Props = {
  // basic
  stream: ?Stream,
  video: boolean,
  audio: boolean,
  fit?: "cover" | "contain",
  placeholder?: Object,

  networkDetect?: boolean,
  // audioDetect?: boolean,

  label?: string,

  // others
  children?: any,
  key?: any,
  className?: string,
  style?: Object,
};

type State = {
  networkStatus: 0 | 1 | 2 // 0 for normal, 1 for warning, 2 for fatal
};

export default class extends Component<Props, State> {

  static defaultProps: Props = {
    stream: undefined,
    video: true,
    audio: true,
    fit: "cover",
    placeholder: {},

    networkDetect: false,
    // audioDetect: false,

    className: '',
    style: {},
  };

  _networkDetector: IntervalID;
  // _audioDetector: IntervalID
  _snapshot: {
    id: number,
    hasVideo: boolean,
    hasAudio: boolean,
    videoOn: boolean,
    audioOn: boolean,
    playing: boolean
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      networkStatus: 0
    };
    this._snapshot = this._getSnapshot();
  }

  startNetworkDetector = () => {
    this.stopNetworkDetector();
    this._networkDetector = setInterval(() => {
      let stream: Stream = (this.props.stream: any);
      stream.getStats(e => {
        if (stream.local) {
          // if local stream, use accessDelay
          let accessDelay = Number.parseInt(e.accessDelay, 10);
          if (isNaN(accessDelay)) {
            return;
          }
          if (accessDelay < 100) {
            this.setState({
              networkStatus: 0
            });
          } else if (accessDelay < 200) {
            this.setState({
              networkStatus: 1
            });
          } else {
            this.setState({
              networkStatus: 2
            });
          }
        } else {
          // if remote stream, use endToEndDelay
          let endToEndDelay = Number.parseInt(e.endToEndDelay, 10);
          if (isNaN(endToEndDelay)) {
            return;
          }
          if (endToEndDelay < 200) {
            this.setState({
              networkStatus: 0
            });
          } else if (endToEndDelay < 400) {
            this.setState({
              networkStatus: 1
            });
          } else {
            this.setState({
              networkStatus: 2
            });
          }
        }
      });
    }, 1500);
  };

  stopNetworkDetector = () => {
    if (this._networkDetector) {
      clearInterval(this._networkDetector);
    }
  };

  _getSnapshot = () => {
    // init snapshot the first time we got it
    let stream: Stream = (this.props.stream: any);
    return {
      id: stream.getId(),
      hasVideo: stream.hasVideo(),
      hasAudio: stream.hasAudio(),
      videoOn: stream.isVideoOn(),
      audioOn: stream.isAudioOn(),
      playing: stream.isPlaying()
    };
  };

  componentDidUpdate() {
    // deal with side effect
    let $prev = this._snapshot;
    let $stream: Stream = (this.props.stream: any);

    // check video
    if (xor($prev.videoOn, this.props.video)) {
      if ($prev.hasVideo) {
        this.props.video ? $stream.enableVideo() : $stream.disableVideo();
      }
    }

    // check audio
    if (xor($prev.audioOn, this.props.audio)) {
      if ($prev.hasAudio) {
        this.props.audio ? $stream.enableAudio() : $stream.disableAudio();
      }
    }

    // check detector
    if (this.props.networkDetect) {
      this.startNetworkDetector();
    } else {
      this.stopNetworkDetector();
    }

    this._snapshot = this._getSnapshot();
  }

  componentDidMount() {
    // check detector
    if (this.props.networkDetect) {
      this.startNetworkDetector();
    }

    // play stream
    let stream = ((this.props.stream: any): Stream)
    stream.play(`agora--player__${stream.getId()}`)
  }

  componentWillUnmount() {
    let stream: Stream = (this.props.stream: any);
    this.stopNetworkDetector();
    if (stream && stream.isPlaying()) {
      stream.stop();
      stream.local && stream.close();
    }
  }

  render() {
    const className = `agora-player__box 
    ${this.props.fit === 'cover' ? 'cover' : 'contain'} 
    ${this.props.className || ''} `;

    const id = `agora--player__${((this.props.stream: any): Stream).getId()}`;
    return (
      <div className={className} id={id} style={this.props.style}>

        {/* mask */}
        {(!this.props.video || !(this._snapshot && this._snapshot.hasVideo)) && (
          <div className="agora-player__placeholder">
            <img
              style={{ maxWidth: "80%" }}
              src={AgoraIcon}
              alt="placeholder for video"
            />
          </div>
        )}

        {/* decoration to display network status */}
        { 
          this.props.networkDetect && 
            <SignalIcon level={this.state.networkStatus} />
        }

        {/* decoration to display stream label */}
        {this.props.label && (
          <div className="agora-player__label">{this.props.label}</div>
        )}

        {this.props.children}
      </div>
    );
  }
}
