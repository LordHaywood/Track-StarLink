import util from './util';

/**
* Takes orbit.TLE object and initialized the SGP4 model
* @class
* @param  {orbit.TLE} tleObj - An instance of TLE
*/
const Orbit = function(tleObj) {
  "use strict";
  this.tle = tleObj;
  this.date = null;

  // init constants
  this.ck2 =5.413080e-4;
  this.ck4 = 0.62098875e-6;
  this.e6a = 1.0e-6;
  this.qoms2t = 1.88027916e-9;
  this.s = 1.01222928;
  this.xj3 = -0.253881e-5;
  this.xke = 0.743669161e-1;
  this.xkmper = 6378.137; // Earth's radius WGS-84
  this.xflat = 0.00335281066; // WGS-84 flattening
  this.xminpday = 1440.0;
  this.ae = 1.0;
  this.pi = Math.PI;
  this.pio2 = this.pi / 2;
  this.twopi = 2 * this.pi;
  this.x3pio2 = 3 * this.pio2;

  this.torad = this.pi/180;
  this.tothrd = 0.66666667;

  this.xinc = this.tle.inclination * this.torad;
  this.xnodeo = this.tle.right_ascension * this.torad;
  this.eo = this.tle.eccentricity;
  this.omegao  = this.tle.argument_of_perigee * this.torad;
  this.xmo = this.tle.mean_anomaly * this.torad;
  this.xno = this.tle.mean_motion * this.twopi / 1440.0;
  this.bstar = this.tle.bstar;

  // recover orignal mean motion (xnodp) and semimajor axis (adop)
  var a1 = Math.pow(this.xke / this.xno, this.tothrd);
  var cosio = Math.cos(this.xinc);
  var theta2 = cosio*cosio;
  var x3thm1 = 3.0 * theta2 - 1;
  var eosq = this.eo * this.eo;
  var betao2= 1.0 - eosq;
  var betao = Math.sqrt(betao2);
  var del1 = 1.5 * this.ck2 * x3thm1 / (a1*a1 * betao*betao2);
  var ao = a1 * (1 - del1 * ((1.0/3.0) + del1 * (1.0 + (134.0/81.0) * del1)));
  var delo = 1.5 * this.ck2 * x3thm1/(ao * ao * betao * betao2);
  var xnodp = this.xno/(1.0 + delo); //original_mean_motion
  var aodp = ao/(1.0 - delo); //semi_major_axis

  // initialization
  this.isimp = ((aodp*(1.0-this.eo)/this.ae) < (220.0/this.xkmper+this.ae)) ? 1 : 0;

  var s4 = this.s;
  var qoms24 = this.qoms2t;
  var perige = (aodp * (1.0-this.eo) - this.ae) * this.xkmper;
  if (perige < 156.0){
      s4 = perige - 78.0;
      if (perige <= 98.0){
        s4 = 20.0;
      } else {
        qoms24 = Math.pow(((120.0 - s4)*this.ae/this.xkmper), 4);
        s4 = s4/this.xkmper+this.ae;
      }
  }
  var pinvsq = 1.0/(aodp * aodp * betao2 * betao2);
  var tsi = 1.0/(aodp - s4);
  var eta = aodp * this.eo * tsi;
  var etasq = eta * eta;
  var eeta = this.eo * eta;
  var psisq = Math.abs(1.0 - etasq);
  var coef = qoms24 * Math.pow(tsi,4);
  var coef1 = coef/Math.pow(psisq,3.5);

  var c2 = coef1 * xnodp * (aodp * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq)) + 0.75 * this.ck2 * tsi/psisq * x3thm1 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
  var c1 = this.bstar * c2;
  var sinio = Math.sin(this.xinc);
  var a3ovk2 = -this.xj3/this.ck2 * Math.pow(this.ae,3);
  var c3 = coef * tsi * a3ovk2 * xnodp * this.ae * sinio/this.eo;
  var x1mth2 = 1.0 - theta2;
  var c4 = 2.0 * xnodp * coef1 * aodp * betao2 * (eta * (2.0 + 0.5 * etasq) + this.eo * (0.5 + 2.0 * etasq) - 2.0 * this.ck2 * tsi/(aodp * psisq) * (-3.0 * x3thm1 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta)) + 0.75 * x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos((2.0 * this.omegao))));
  this.c5 = 2.0 * coef1 * aodp * betao2 * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);

  var theta4 = theta2 * theta2;
  var temp1 = 3.0 * this.ck2 * pinvsq * xnodp;
  var temp2 = temp1 * this.ck2 * pinvsq;
  var temp3 = 1.25 * this.ck4 * pinvsq * pinvsq * xnodp;
  this.xmdot = xnodp + 0.5 * temp1 * betao * x3thm1 + 0.0625 * temp2 * betao * (13.0 - 78.0 * theta2 + 137.0 * theta4);

  var x1m5th = 1.0 - 5.0 * theta2;
  this.omgdot = -0.5 * temp1 * x1m5th + 0.0625 * temp2 * (7.0 - 114.0 * theta2 + 395.0 * theta4) + temp3 * (3.0 - 36.0 * theta2 + 49.0 * theta4);
  var xhdot1 = -temp1 * cosio;
  this.xnodot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * theta2) + 2.0 * temp3 * (3.0 - 7.0 * theta2)) * cosio;
  this.omgcof = this.bstar * c3 * Math.cos(this.omegao);
  this.xmcof = -this.tothrd * coef * this.bstar * this.ae/eeta;
  this.xnodcf = 3.5 * betao2 * xhdot1 * c1;
  this.t2cof = 1.5 * c1;
  this.xlcof = 0.125 * a3ovk2 * sinio * (3.0 + 5.0 * cosio)/(1.0 + cosio);
  this.aycof = 0.25 * a3ovk2 * sinio;
  this.delmo = Math.pow((1.0 + eta * Math.cos(this.xmo)),3);
  this.sinmo = Math.sin(this.xmo);
  this.x7thm1 = 7.0 * theta2 - 1.0;

  var d2, d3, d4;
  if (this.isimp != 1){
      var c1sq = c1 * c1;
      d2 = 4.0 * aodp * tsi * c1sq;
      var temp = d2 * tsi * c1/3.0;
      d3 = (17.0 * aodp + s4) * temp;
      d4 = 0.5 * temp * aodp * tsi * (221.0 * aodp + 31.0 * s4) * c1;
      this.t3cof = d2 + 2.0 * c1sq;
      this.t4cof = 0.25 * (3.0 * d3 + c1 * (12.0 * d2 + 10.0 * c1sq));
      this.t5cof = 0.2 * (3.0 * d4 + 12.0 * c1 * d3 + 6.0 * d2 * d2 + 15.0 * c1sq * (2.0 * d2 + c1sq));
  }

  // set variables that are needed in the calculate() routine
  this.aodp = aodp;
  this.c1 = c1;
  this.c4 = c4;
  this.cosio = cosio;
  this.d2 = d2;
  this.d3 = d3;
  this.d4 = d4;
  this.eta = eta;
  this.sinio = sinio;
  this.x3thm1 = x3thm1;
  this.x1mth2 = x1mth2;
  this.xnodp = xnodp;
};

/**
*calculates position and velocity vectors based date set on the Orbit object
*/
Orbit.prototype.propagate = function() {
  "use strict";
  var date = (this.date === null) ? new Date() : this.date;
  var tsince = this.tle.dtime(date);

  // update for secular gravity and atmospheric drag

  var xmdf = this.xmo + this.xmdot * tsince;
  var omgadf = this.omegao + this.omgdot * tsince;
  var xnoddf = this.xnodeo + this.xnodot * tsince;
  var omega = omgadf;
  var xmp = xmdf;
  var tsq = tsince * tsince;
  var xnode = xnoddf + this.xnodcf * tsq;
  var tempa= 1.0 - this.c1 * tsince;
  var tempe = this.bstar * this.c4 * tsince;
  var templ = this.t2cof * tsq;

  var temp;
  if (this.isimp != 1){
      var delomg = this.omgcof * tsince;
      var delm = this.xmcof * (Math.pow((1.0 + this.eta * Math.cos(xmdf)),3) - this.delmo);
      temp = delomg + delm;
      xmp = xmdf + temp;
      omega = omgadf - temp;
      var tcube = tsq * tsince;
      var tfour = tsince * tcube;
      tempa = tempa - this.d2 * tsq - this.d3 * tcube - this.d4 * tfour;
      tempe = tempe + this.bstar * this.c5 * (Math.sin(xmp) - this.sinmo);
      templ = templ + this.t3cof * tcube + tfour * (this.t4cof + tsince * this.t5cof);
  }
  var a = this.aodp * tempa * tempa;
  var e = this.eo - tempe;
  var xl = xmp + omega + xnode + this.xnodp * templ;
  var beta = Math.sqrt(1.0 - e*e);
  var xn = this.xke/Math.pow(a,1.5);

  // long period periodics
  var axn = e * Math.cos(omega);
  temp = 1.0/(a * beta * beta);
  var xll = temp * this.xlcof * axn;
  var aynl = temp * this.aycof;
  var xlt = xl + xll;
  var ayn = e * Math.sin(omega) + aynl;

  // solve keplers equation

  var capu = (xlt-xnode)%(2.0*Math.PI);
  var temp2 = capu;
  var i;
  var temp3, temp4, temp5, temp6;
  var sinepw, cosepw;
  for (i=1; i<=10; i++){
      sinepw = Math.sin(temp2);
      cosepw = Math.cos(temp2);
      temp3 = axn * sinepw;
      temp4 = ayn * cosepw;
      temp5 = axn * cosepw;
      temp6 = ayn * sinepw;
      var epw = (capu - temp4 + temp3 - temp2)/(1.0 - temp5 - temp6) + temp2;
      if (Math.abs(epw - temp2) <= this.e6a){
          break;
      }
      temp2 = epw;
  }
   // short period preliminary quantities

  var ecose = temp5 + temp6;
  var esine = temp3 - temp4;
  var elsq = axn * axn + ayn * ayn;
  temp = 1.0 - elsq;
  var pl = a*temp;
  var r = a*(1.0 - ecose);
  var temp1 = 1.0/r;
  var rdot = this.xke * Math.sqrt(a) * esine * temp1;
  var rfdot = this.xke * Math.sqrt(pl) * temp1;
  temp2 = a*temp1;
  var betal = Math.sqrt(temp);
  temp3 = 1.0/(1.0 + betal);
  var cosu = temp2 * (cosepw - axn + ayn * esine * temp3);
  var sinu = temp2 * (sinepw - ayn - axn * esine * temp3);
  var u = Math.atan2(sinu,cosu);
  u += (u<0) ? 2* Math.PI : 0;
  var sin2u = 2.0 * sinu * cosu;
  var cos2u = 2.0 * cosu * cosu - 1.0;
  temp = 1.0/pl;
  temp1 = this.ck2 * temp;
  temp2 = temp1 * temp;

  // update for short periodics

  var rk = r*(1.0 - 1.5 * temp2 * betal * this.x3thm1) + 0.5 * temp1 * this.x1mth2 * cos2u;
  var uk = u-0.25 * temp2 * this.x7thm1 * sin2u;
  var xnodek = xnode + 1.5 * temp2 * this.cosio * sin2u;
  var xinck = this.xinc + 1.5 * temp2 * this.cosio * this.sinio * cos2u;
  var rdotk = rdot - xn * temp1 * this.x1mth2 * sin2u;
  var rfdotk = rfdot + xn * temp1 * (this.x1mth2 * cos2u + 1.5 * this.x3thm1);

  // orientation vectors

  var sinuk = Math.sin(uk);
  var cosuk = Math.cos(uk);
  var sinik = Math.sin(xinck);
  var cosik = Math.cos(xinck);
  var sinnok = Math.sin(xnodek);
  var cosnok = Math.cos(xnodek);
  var xmx = -sinnok * cosik;
  var xmy = cosnok * cosik;
  var ux = xmx * sinuk + cosnok * cosuk;
  var uy = xmy * sinuk + sinnok * cosuk;
  var uz = sinik * sinuk;
  var vx = xmx * cosuk - cosnok * sinuk;
  var vy = xmy * cosuk - sinnok * sinuk;
  var vz = sinik * cosuk;

  // position and velocity in km
  this.x = (rk * ux) * this.xkmper;
  this.y = (rk * uy) * this.xkmper;
  this.z = (rk * uz) * this.xkmper;
  this.xdot = (rdotk * ux + rfdotk * vx) * this.xkmper;
  this.ydot = (rdotk * uy + rfdotk * vy) * this.xkmper;
  this.zdot = (rdotk * uz + rfdotk * vz) * this.xkmper;

  /**
   * orbit period in seconds
   * @type {float}
   * @readonly
   */
  this.period = this.twopi * Math.sqrt(Math.pow(this.aodp * this.xkmper , 3)/398600.4);

  /**
   * velocity in km per second
   * @type {float}
   * @readonly
   */
  this.velocity = Math.sqrt(this.xdot*this.xdot + this.ydot*this.ydot + this.zdot*this.zdot) / 60; // kmps

  // lat, lon and altitude
  // based on http://www.celestrak.com/columns/v02n03/

  a = 6378.137;
  var b = 6356.7523142;
  var R = Math.sqrt(this.x*this.x + this.y*this.y);
  var f = (a - b)/a;
  var gmst = util.gmst(date);

  var e2 = ((2*f) - (f*f));
  var longitude = Math.atan2(this.y, this.x) - gmst;
  var latitude = Math.atan2(this.z, R);

  var C;
  var iterations = 20;
  while(iterations--) {
      C = 1 / Math.sqrt( 1 - e2*(Math.sin(latitude)*Math.sin(latitude)) );
      latitude = Math.atan2 (this.z + (a*C*e2*Math.sin(latitude)), R);
  }

  /**
   * Altitude in kms
   * @type {float}
   * @readonly
   */
  this.altitude = (R/Math.cos(latitude)) - (a*C);

  // convert from radii to degrees
  longitude  = (longitude / this.torad) % 360;
  if(longitude > 180) longitude = 360 - longitude;
  else if(longitude < -180) longitude = 360 + longitude;
  latitude  = (latitude / this.torad);

  /**
   * latitude in degrees
   * @type {float}
   * @readonly
   */
  this.latitude = latitude;

  /**
   * longtitude in degrees
   * @type {float}
   * @readonly
   */
  this.longitude = longitude;
};

/**
* Change the datetime, or null for to use current
* @param {Date} date
*/
Orbit.prototype.setDate = function(date) {
  this.date = date;
};

/**
* get position
* @returns {float[]} [latitude, longitude]
*/
Orbit.prototype.getPosition = function() {
  return [this.latitude, this.longitude];
};

/**
* get position in LatLng
* @returns {lat, lng}
*/
Orbit.prototype.getLatLng = function() {
  return {latitude: this.latitude, longitude: this.longitude};
};

/**
* get altitude in km
* @returns {float}
*/
Orbit.prototype.getAltitude = function() {
  return this.altitude;
};

/**
* get velocity in km per seconds
* @returns {float}
*/
Orbit.prototype.getVelocity = function() {
  return this.velocity;
};

/**
*get period in seconds
* @returns {float}
*/
Orbit.prototype.getPeriod = function() {
  return this.period;
};

module.exports = Orbit;