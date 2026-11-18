import {Wishlist} from "@/components/shop/wishlist";
export const metadata={title:"Wishlist",robots:{index:false}};
export default function Page(){return <div className="shop-container page"><header className="shop-page-heading"><h1>Wishlist saya</h1></header><Wishlist/></div>}
