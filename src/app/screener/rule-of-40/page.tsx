import React from "react";
import { Rule40Client } from "./RuleOf40Client";

const RuleOf40Page = async () => {
  try {
    const data = await fetch("http://localhost:3000/api/screener/rule-of-40", {
      next: {
        revalidate: 0,
      },
      cache: "no-store",
    }).then((res) => res.json());

    console.log(data);

    return <Rule40Client data={data.companies} />;
  } catch (error) {
    console.error(error);
  }

  return <div>Error</div>;
};

export default RuleOf40Page;
