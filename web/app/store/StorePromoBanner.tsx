import Link from "next/link";
import "./StorePromoBanner.css";

export default function StorePromoBanner() {
  return (
    <section className="store-promo" aria-labelledby="store-promo-title">
      <div className="store-promo-copy">
        <div className="store-promo-kicker">NEAS ONLINE STORE · WORK-AT-HEIGHT ESSENTIALS</div>
        <h2 id="store-promo-title">GEAR UP. <span>WORK SAFE.</span> REACH HIGHER.</h2>
        <p>Equip your team with trusted rope-access and height-safety essentials for demanding worksites.</p>
        <div className="store-promo-points" aria-label="Store categories">
          <span>Certified PPE</span><span>Rope-access gear</span><span>Work-at-height essentials</span>
        </div>
        <Link className="store-promo-cta" href="#store-products">EXPLORE THE NEAS STORE <span aria-hidden="true">→</span></Link>
      </div>
      <div className="store-promo-visual" aria-hidden="true">
        <div className="store-promo-glow" />
        <div className="store-promo-laptop">
          <div className="store-promo-screen">
            <div className="store-promo-screenbar"><i /><i /><i /><b>NEAS ONLINE STORE</b></div>
            <div className="store-promo-screencontent">
              <img src="/img/logo.png" alt="" />
              <strong>GEAR UP.<br />WORK SAFE.</strong>
              <small>REACH HIGHER.</small>
              <div className="store-promo-screenline" />
              <em>ROPE ACCESS · HEIGHT SAFETY</em>
            </div>
          </div>
          <div className="store-promo-base"><span /></div>
        </div>
        <div className="store-promo-chip">NEXTEDGE ACCESS SOLUTIONS</div>
      </div>
    </section>
  );
}
