import * as Preact from '#preact';
import {useCallback, useEffect, useRef} from '#preact';
import {MessageType} from '#preact/component/3p-frame';
import {toWin} from '#core/window';

const NOOP = () => {};
const FULL_HEIGHT = '100%';

/**
 * @param {!IframeDef.Props} props
 * @return {PreactDef.Renderable}
 */
export function Iframe({
  allowFullScreen,
  allowPaymentRequest,
  allowTransparency,
  onLoad = NOOP,
  referrerPolicy,
  requestResize,
  sandbox,
  src,
  srcdoc,
  ...rest
}) {
  const iframeRef = useRef();
  const dataRef = useRef(null);
  const isIntersectingRef = useRef(false);

  const attemptResize = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }
    const height = Number(dataRef.current.height);
    const width = Number(dataRef.current.width);
    if (!height && !width) {
      return;
    }
    if (requestResize) {
      // Currently `requestResize` is called twice:
      // 1. when the message is received in viewport
      // 2. when exiting viewport
      // This could be optimized by reducing to one call by assessing when to call.
      requestResize(height, width);
      iframe.height = FULL_HEIGHT;
      iframe.width = FULL_HEIGHT;
    } else if (!isIntersectingRef.current) {
      if (width) {
        iframe.width = width;
      }
      if (height) {
        iframe.height = height;
      }
    }
  }, [requestResize]);

  const handlePostMessage = useCallback(
    (event) => {
      if (event.data?.type !== MessageType.EMBED_SIZE) {
        return;
      }
      const {width, height} = event.data;
      attemptResize(width, height);
    },
    [attemptResize]
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }
    const win = iframe && toWin(iframe.ownerDocument.defaultView);
    if (!win) {
      return;
    }
    const io = new win.IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      isIntersectingRef.current = last.isIntersecting;
      if (last.isIntersecting || !dataRef.current || !win) {
        return;
      }
      attemptResize();
    });
    io.observe(iframe);
    win.addEventListener('message', handlePostMessage);

    return () => {
      io.unobserve(iframe);
      win.removeEventListener('message', handlePostMessage);
    };
  }, [attemptResize, handlePostMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      srcdoc={srcdoc}
      sandbox={sandbox}
      allowfullscreen={allowFullScreen}
      allowpaymentrequest={allowPaymentRequest}
      allowtransparency={allowTransparency}
      referrerpolicy={referrerPolicy}
      onload={onLoad}
      frameBorder="0"
      {...rest}
    ></iframe>
  );
}
